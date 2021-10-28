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

const {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand,
  StartInstancesCommand,
  StopInstancesCommand
} = require("@aws-sdk/client-ec2");

const {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const {
  SSMClient,
  SendCommandCommand,
  ListCommandsCommand,
  GetCommandInvocationCommand,
  ListCommandInvocationsCommand
} = require("@aws-sdk/client-ssm");

const SFTPClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');
const resolve = require("bluebird");
const _ = require("lodash");

/**
 * Class to interact with AWS instance of Arm Virtual Targets
 *
 * constructor params:
 * @param {string} filepath           Path to the testsuite on host. Needs vht.yml in root.
 * @param {string} instance_id        EC2 instance ID.
 * @param {string} aws_region         AWS Region
 * @param {string} access_key_id      IAM Access Key with permissions: AmazonEC2FullAccess, AmazonSSMFullAccess
 * @param {string} secret_access_key  IAM Secret Key to Access Key
 * @param {string} session_token       Session Token (optional)
 *
 */

class VHTManagement {
  constructor(filepath,
              instance_id,
              aws_region,
              s3_bucket_name,
              access_key_id,
              secret_access_key,
              session_token) {
    process.env['AWS_ACCESS_KEY_ID'] = access_key_id;
    process.env['AWS_SECRET_ACCESS_KEY'] = secret_access_key;
    process.env['AWS_SESSION_TOKEN'] = session_token;
    process.env['AWS_DEFAULT_REGION'] = aws_region;

    console.info("Constructor of VHT class")

    /** @private @const {EC2Client} */
    this.ec2_client = new EC2Client({
      region: aws_region
    });
    console.info("EC2 client created!")

    /** @private @const {S3Client} */
    this.s3_client = new S3Client({
      region: aws_region
    });
    console.info("S3 client created!")

    /** @private @const {SSMClient} */
    this.ssm_client = new SSMClient({
      region: aws_region
    });
    console.info("SSM client created!")

    this.aws_region = aws_region
    this.s3_bucket_name = s3_bucket_name

    /** @private @const {string[]} */
    if (!Array.isArray(instance_id)) this.instance_id = [instance_id];

    console.info("Constructor of VHT class done!")

  }

  /** Generic sleep function */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Collect DescribeInstance info */
  async describeEC2InstancesState(debug = false) {
    try {
      const data = await this.ec2_client.send(new DescribeInstancesCommand({ InstanceIds: [ this.instance_id ] }));
      if (debug) console.log("Success", JSON.stringify(data));
      return data;
    } catch (err) {
      console.log("Error", err);
    }
  };

  /** Collect DescribeInstanceStatus info */
  async describeEC2InstancesStatus(debug = false) {
    try {
      const data = await this.ec2_client.send(new DescribeInstanceStatusCommand({ InstanceIds: [ this.instance_id ] }));
      if (debug) console.log("Success", JSON.stringify(data));
      return data;
    } catch (err) {
      console.log("Error", err);
    }
  };

  /** Check status of instance in this.instance_id **/
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
  async sendFiles(localpath, remotepath) {

    return new Promise((resolve, reject) => {
      console.log("Uploading ", localpath);

      this.sftp = new SFTPClient();
      this.sftp.connect({
        host: this.instance_public_dns,
        username: 'root',
        privateKey: this.pem_private
      }).then(() => {
        this.sftp.fastPut(localpath, remotepath);
      }).then(data => {
        console.log('Uploaded ', data);
        return resolve(data);
      }).catch(err => {
        console.log('SFTP error ', err);
        return reject();
      });
    });

  }

  /** get files from the remote */
  async getFiles(remotepath, localpath) {

    return new Promise((resolve, reject) => {
      console.log("Downloading ", remotepath);
      this.sftp = new SFTPClient();
      this.sftp.connect({
        host: this.instance_public_dns,
        username: 'root',
        privateKey: this.pem_private
      }).then(() => {
        this.sftp.fastGet(remotepath, localpath);
      }).then(data => {
        console.log('Downloaded ', data);
        resolve();
      }).catch(err => {
        console.log('SFTP error ', err);
        reject();
      });
    });
  }

  /**
   * Function will send the command to EC2 machines
   * @params {Object} commandParameters : command parameters information
   */
  async sendCommandToInstances(commandParameters) {
    let ssm_client = this.ssm_client;
    return new Promise(function (resolve, reject) {
      console.log(commandParameters);
      let command = new SendCommandCommand(commandParameters);
      ssm_client.send(command, function (err, data) {
        if (err) {
          console.log("Error: " + err);
          return reject("Request Failed!");
        }
        return resolve(data);
      });
    });
  }

  /**
   * Function will check the command status i.e. Success, Failed
   * @params {String} commandId : command Id
   * @params {Number} maxRetry
   */
  async checkCommandStatus(commandId, maxRetry) {
    let currentTry = 1;
    return new Promise((resolve, reject) => {
      let input = {
        CommandId: commandId
      };
      let toStopInterval = setInterval(() => {
        let command = new ListCommandsCommand(input);
        this.ssm_client.send(command, (err, data) => {
          if (err) reject("Command id not found");
          if (currentTry > maxRetry) {
            clearInterval(toStopInterval);
            return reject("Max Limit Reached! Status cannot determined");
          }
          let commandStatus = data.Commands[0].Status;
          if (commandStatus === "InProgress") {
            currentTry += 1;
          }
          else {
            clearInterval(toStopInterval);
            return resolve(data.Commands[0].Status);
          }
        });
      }, 1500);
    });
  }

  /**
   * Get the command logs
   * @params {String} instanceId : Instance Id of Ec2 machine
   * @params {String} commandId : command Id
   * @params {String} commandExecStatus : command status
   */
  async getCommandsLogs(instanceId, commandId, commandExecStatus) {
    let input = {
      CommandId: commandId,
      InstanceId: instanceId
    }
    return new Promise((resolve, reject) => {
      let command = new GetCommandInvocationCommand(input);
      this.ssm_client.send(command, (err, data) => {
        if (err) {
          console.error("Error came while fetching the logs ", err);
          reject(err);
        }
        let logs = commandExecStatus === "Success" ? data.StandardOutputContent : data.StandardErrorContent
        return resolve(logs);
      })
    })
  }

  /** Launch the instance in this.instance_id */
  async startInstance() {
    let input = {
      InstanceIds:
        this.instance_id
    }
    const command = new StartInstancesCommand(input);
    try {
      const data = await this.ec2_client.send(command);
      await this.waitForEC2StateName('running');
      await this.waitForEC2Status('ok');
      return true;
    }
    catch (err) {
      console.log("Error", err);
    }
  }

  /** Stop the instance in this.instance_id */
  async stopInstance() {
    let input = {
      InstanceIds:
      this.instance_id
    }
    const command = new StopInstancesCommand(input);
    try {
      const data = await this.ec2_client.send(command);
      await this.waitForEC2StateName('stopped');
      return true;
    }
    catch (err) {
      console.log("Error", err);
    }
  }

  /** Launch the vht.yml processing on the remote node */
  async executeVHT() {
    return new Promise((resolve, reject) => {
      const data = this.executeRemoteShellCommand(["runuser -l ubuntu -c 'source vars && python3 /home/ubuntu/vhtagent/process_vht.py'"]);
      resolve(data);
    });
  }

  /** Launch the vht.yml processing on the remote node */
  async getSSHKey() {
    return new Promise((resolve, reject) => {
      const data = this.executeRemoteShellCommand(["cat /home/ubuntu/vhtagent/github.pem"]);
      this.pem_private = data;
      resolve(data);
    });
  }

  /**
 * Execute Shell commands into Local github runner.
 * @param cmd {string}
 * @return {Promise<string>}
 */
  async executeLocalShellCommand(cmd) {
    const exec = require('child_process').exec;
    console.log("cmd: ", cmd);
    return new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.warn(error);
        }
        console.log("stdout: ", stdout);
        console.log("stderr: ", stderr);
        resolve(stdout? stdout : stderr);
      });
    });
  }

  // Method which runs Shell commands in the Remote EC2 instance
  async executeRemoteShellCommand(commandlist, workingDir = ["/home/ubuntu/vhtwork"]) {
    if (!_.isEmpty(this.instance_id)) {
      try {
        let commandParameters = {
          DocumentName: "AWS-RunShellScript",
          Targets: [{
            Key: "InstanceIds",
            Values: this.instance_id
          }],
          Region: this.aws_region,
          Parameters: {
            workingDirectory: workingDir,
            commands: commandlist
          },
          TimeoutSeconds: 60000,
          MaxConcurrency: "50",
          MaxErrors: "0",
        };

        let data = await this.sendCommandToInstances(commandParameters);
        let commandExecStatus = await this.checkCommandStatus(data.Command.CommandId, 300);
        console.info("Command Status is ", commandExecStatus, "\n");
        let logs = await this.getCommandsLogs(this.instance_id[0], data.Command.CommandId, commandExecStatus);
        return Promise.resolve(logs);
      } catch (err) {
        console.error("Error came while sending commands ", err);
        return Promise.reject(err);
      }
    } else {
      console.error("No Instances are ready for receiving the command")
      return "No Instances are ready for receiving the commands"
    }
  }

  /** Upload File to the S3 Bucket
   * Not used so far **/
  async uploadFileToS3Bucket(filepath, debug = false) {
    try {
      // Create a filestream from a file
      console.log("upload filepath = " + filepath);
      const fileStream = fs.createReadStream(filepath);

      // Set the uploadParams parameters
      const uploadParams = {
        Bucket: this.s3_bucket_name,
        Key: path.basename(filepath),
        Body: fileStream
      };

      if(debug) console.log("uploadParams = " + uploadParams);
      const data = await this.s3_client.send(new PutObjectCommand(uploadParams));
      if (debug) console.log("Success", data);
      return data;
    } catch(err) {
      console.log("Error", err);
    }
  }


  /** getFileFromS3ToInstance File to the S3 Bucket
   * Not used so far **/
  async getFileFromS3ToInstance(key, debug = false) {
    try {

      const bucketParams = {
        Bucket: this.s3_bucket_name,
        Key: key,
      };

      // Create a helper function to convert a ReadableStream to a string.
      const streamToString = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      });

      // Get the object} from the Amazon S3 bucket. It is returned as a ReadableStream.
      const data = await this.s3_client.send(new GetObjectCommand(bucketParams));
      console.log(data);

      // Convert the ReadableStream to a string.
      const bodyContents = await streamToString(data.Body);
      console.log(bodyContents);

    } catch(err) {
      console.log("Error", err);
    }
  }

  /** Valid ec2StateName: pending | running | shutting-down | terminated | stopping | stopped **/
  async waitForEC2StateName(ec2StateName, waitTimeSec = 10) {
    try {
        var found = false;
        while(found == false) {
            const data = await this.describeEC2InstancesState();
            console.log("EC2 instance state name == " + data.Reservations[0].Instances[0].State.Name);
            if (data.Reservations[0].Instances[0].State.Name == ec2StateName) {
                found = true;
                break;
            }
            await this.sleep(1000*waitTimeSec);
        }
    } catch (err) {
        console.log("Error", err);
    }
  }

  /** Valid ec2StatusName: ok | impaired | initializing | insufficient-data | not-applicable **/
  async waitForEC2Status(ec2StatusName, waitTimeSec = 10) {
    try {
        var found = false;
        while(found == false) {
            const data = await this.describeEC2InstancesStatus();
            console.log("EC2 instance status name == " + data.InstanceStatuses[0].InstanceStatus.Status);
            if (data.InstanceStatuses[0].InstanceStatus.Status == ec2StatusName) {
                found = true;
                break;
            }
            await this.sleep(1000*waitTimeSec);
        }
    } catch (err) {
        console.log("Error", err);
    }
  }
}

module.exports = VHTManagement;