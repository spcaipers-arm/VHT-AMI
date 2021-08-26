/*******************************************************************************
* MIT License
* 
* Copyright (c) 2021 Arm Ltd.
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*******************************************************************************/

'use strict';

const { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand   } = require("@aws-sdk/client-ec2");
const { SSMClient, SendCommandCommand, ListCommandsCommand, GetCommandInvocationCommand } = require("@aws-sdk/client-ssm");
const { resolve } = require("bluebird");
const { reject } = require("lodash");

/**
 * Class to interact with AWS instance of Arm Virtual Targets
 * 
 * constructor params:
 * @param {string} filepath       Path to the testsuite on host. Needs avt.yml in root.
 * @param {string} instance_id    EC2 instance ID.
 * @param {string} access_key_id  IAM Access Key with permissions: AmazonEC2FullAccess, AmazonSSMFullAccess
 * @param {string} secret_key_id  IAM Secret Key to Access Key
 * 
 */

class AVTManagement {
  constructor(filepath, instance_id, access_key_id, secret_key_id) {
    process.env['AWS_ACCESS_KEY_ID'] = access_key_id; 
    process.env['AWS_SECRET_ACCESS_KEY'] = secret_key_id;
    console.info("Constructor of AVT class")      
    /** @private @const {EC2Client} */
    this.ec2_client = new EC2Client( { 
        region: "us-west-2"
    });
    /** @private @const {SSMClient} */
    this.ssm_client = new SSMClient( { 
      region: "us-west-2"
    });
    /** @private @const {string[]} */
    if (!Array.isArray(instance_id)) this.instance_id = [instance_id];
  }

  /** Generic sleep function */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  //* Check status of instance in this.instance_id */
  async getStatus() {
    let input = {
      InstanceIds:
        this.instance_id
    }
    const command = new DescribeInstancesCommand(input);
    try {    
      const data = await this.ec2_client.send(command);
      this.instance_state = data.Reservations[0].Instances[0].State.Name; 
      if (this.instance_state == "stopped") return false;
      this.instance_public_dns = data.Reservations[0].Instances[0].PublicDnsName
      return true;      
    }
    catch (err) {
      console.log("Error", err);
    }   
  };


  /** send files to the remote */
  sendFiles(localpath, remotepath)  {
    console.info("sending files")

  }

  /** get files from the remote */
  getFiles(remotepath, localpath) { 

  }
  
  //Launch the instance in this.instance_id
  async startInstance() {
    let input = {
      InstanceIds:
        this.instance_id
    }
    const command = new StartInstancesCommand (input);
    try {    
      const data = await this.ec2_client.send(command);
      this.instance_state = data.StartingInstances[0].CurrentState.Name; 
      if (this.instance_state == "pending") this.sleep(20000);
      return true;      
    }
    catch (err) {
      console.log("Error", err);
    }   
  }

  //Stop the instance in this.instance_id
  async stopInstance() {
    let input = {
      InstanceIds:
        this.instance_id

    }
    const command = new StopInstancesCommand (input);
    try {    
      const data = await this.ec2_client.send(command);
      this.instance_state = data.StoppingInstances[0].CurrentState.Name;
      if (this.instance_state == "stopping") this.sleep(20000);
      return true;
    }
    catch (err) {
      console.log("Error", err);
    }   
  }

  //Launch the avt.yml processing on the remote node
  async executeAVT() {
    let commandParameters = {
      DocumentName: "AWS-RunShellScript",
      Targets: [{
        Key: "InstanceIds",
        Values: this.instance_id
      }],
      Parameters: {
      workingDirectory: ["/home/ubuntu/work"],
      commands: ["python3 /home/ubuntu/avtengine/process_avt.py"]
    },
    TimeoutSeconds: 60000,
     MaxConcurrency: "50",
     MaxErrors: "0",
    };

    let command = new SendCommandCommand (commandParameters);    
    let data = await this.ssm_client.send(command);
    let command_id = data.Command.CommandId;

    new Promise((resolve, reject) => {
      let input = {
        CommandId: command_id
      };  
      command = new ListCommandsCommand (input);
      let toStopInterval = setInterval(() => {
        this.ssm_client.send(command, (err, data) => {
          if (err) reject("Command id not found");
          if (currentTry > maxRetry) {
            clearInterval(toStopInterval);
            reject("Max Limit Reached! Status cannot determined");
          }
          let commandStatus = data.Commands[0].Status;
          if (commandStatus === "InProgress") {
            currentTry += 1;
            }
          else {
             clearInterval(toStopInterval);
             resolve(data.Commands[0].Status);
          }
        });
      }, 1500);
    });
    new Promise((resolve, reject) => {
      let input = {
        CommandId: command_id,
        InstanceId: this.instance_id[0]
      };  
      command = new GetCommandInvocationCommand(input);
      this.ssm_client.send(command, (err, data) => {
        if (err) {
          console.error("No command logs", err);
          reject(err);
        }
        JSON.stringify(data);

      });
    });
    
  }

}

module.exports = AVTManagement;