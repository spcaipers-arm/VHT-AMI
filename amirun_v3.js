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

const VHT = require("./vht.js");
var path = require('path');
var tar = require('tar');
const { resolve } = require("path");

var amirun = async function (access_key_id,
                             ami_id,
                             aws_region,
                             iam_role,
                             instance_id,
                             instance_type,
                             s3_bucket_name,
                             secret_access_key,
                             security_group_id,
                             session_token,
                             ssh_key_name,
                             subnet_id,
                             terminate_ec2_instance,
                             vht_in) {

  const vht = new VHT(access_key_id,
                      ami_id,
                      aws_region,
                      iam_role,
                      instance_id,
                      instance_type,
                      s3_bucket_name,
                      secret_access_key,
                      security_group_id,
                      session_token,
                      ssh_key_name,
                      subnet_id,
                      terminate_ec2_instance,
                      vht_in);

  if (instance_id == '') {
    /* This means a new EC2 instance needs to be created. */
    console.log("New EC2 instance will be created");
    var instance_id = await vht.executeLocalShellCommand(`aws ec2 run-instances ` +
                                                            `--image-id ${ami_id} ` +
                                                            `--count 1 ` +
                                                            `--instance-type ${instance_type} ` +
                                                            `--key-name ${ssh_key_name} ` +
                                                            `--security-group-ids ${security_group_id} ` +
                                                            `--iam-instance-profile ${iam_role} ` +
                                                            `--subnet-id ${subnet_id} ` +
                                                            `--tag-specifications "ResourceType=instance,Tags=[{Key=VHTGitHubAction,Value=true}]" ` +
                                                            `--output text | awk '/INSTANCE/{print $9}'`);

    vht.instance_id = [ instance_id.trim() ];
    console.log("Waiting for EC2 to be ready!");
    await vht.executeLocalShellCommand(`aws ec2 wait instance-status-ok --instance-ids ${vht.instance_id}`);
  } else {
    /* An VHT EC2 instance already exists */
    console.log("EC2 already exists");
    var stat = await vht.getStatus();

    if (stat == true) {
      console.log("EC2 Instance is ready");
    } else {
      console.log("EC2 Instance is not ready");
      if (vht.instance_state == "stopped") {
        console.log("Trying to start the instance");
        await vht.startInstance();
      }
    }
  }

  console.log("Working on directory (vht_in): ", vht_in);
  filepath =  path.join(process.cwd(), vht_in);
  tar_cwd = process.cwd();
  console.log("cwd/vht_in= ",filepath);

  // Tar vht_in into the current folder
  tar.create({
      file: 'vht.tar',
      C: tar_cwd
    },
    [vht_in]
  ).then(_ => { ".. tarball has been created .." });

  console.log("Create a var file with required envs from ubuntu user:");
  await vht.executeRemoteShellCommand(["runuser -l ubuntu -c 'cat ~/.bashrc | grep export > vars'"], ['/home/ubuntu']);

  console.log("Uploading vht.tar from GH Runner to AWS S3 bucket:");
  await vht.executeLocalShellCommand("aws s3 cp vht.tar s3://" + s3_bucket_name + "/vht.tar");

  console.log("Creating folders:")
  await vht.executeRemoteShellCommand(['rm -rf vhtagent' ], ['/home/ubuntu']);
  await vht.executeRemoteShellCommand(['rm -rf vhtwork' ], ['/home/ubuntu']);
  await vht.executeRemoteShellCommand(["runuser -l ubuntu -c 'mkdir vhtagent'"], ['/home/ubuntu']);
  await vht.executeRemoteShellCommand(["runuser -l ubuntu -c 'mkdir vhtwork'"], ['/home/ubuntu']);
  await vht.executeRemoteShellCommand(["runuser -l ubuntu -c 'mkdir -p /home/ubuntu/packs/.Web'"]);

  console.log("Downloading the build/test script:");
  await vht.executeRemoteShellCommand(["runuser -l ubuntu -c 'cd /home/ubuntu/vhtagent && wget https://raw.githubusercontent.com/ARM-software/VHT-AMI/master/agent/process_vht.py'"], ['/home/ubuntu/vhtagent']);

  console.log("Downloading index file for the packs:");
  await vht.executeRemoteShellCommand(["runuser -l ubuntu -c 'wget -N https://www.keil.com/pack/index.pidx -O /home/ubuntu/packs/.Web/index.pidx'"]);

  console.log("Install aws cli:")
  await vht.executeRemoteShellCommand(["apt update"]);
  await vht.executeRemoteShellCommand(["apt install awscli -y"]);

  console.log("Copying back the vht.tar from AWS S3 Bucket to the AWS EC2 instance:");
  await vht.executeRemoteShellCommand(["aws s3 cp s3://" + s3_bucket_name + "/vht.tar vht.tar"]);

  console.log("Executing build/test VHT:");
  data = await vht.executeVHT();
  console.log(data);

  console.log("Copy out.tar from AWS EC2 instance to the AWS S3 bucket");
  await vht.executeRemoteShellCommand(["aws s3 cp out.tar s3://" + s3_bucket_name + "/out.tar"]);

  console.log("Getting the out.tar file from AWS S3 bucket to the GH Runner");
  await vht.executeLocalShellCommand("aws s3 cp s3://" + s3_bucket_name + "/out.tar out.tar");

  console.log("Remove vht.tar from AWS S3 Bucket");
  await vht.executeLocalShellCommand("aws s3 rm s3://" + s3_bucket_name + "/vht.tar");
  console.log("Remove out.tar from AWS S3 Bucket");
  await vht.executeLocalShellCommand("aws s3 rm s3://" + s3_bucket_name + "/out.tar");

  await vht.stopInstance();

  if(terminate_ec2_instance == 'true') {
    console.log(`Terminate EC2 instance ${instance_id}`);
    await vht.executeLocalShellCommand(`aws ec2 terminate-instances --instance-ids ${instance_id}`);
  }

 resolve();
 process.exit();
};

module.exports = amirun;
