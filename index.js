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

const core = require('@actions/core');
const amirun = require('./amirun_v3');

// most @actions toolkit packages have async methods
async function run() {
  try {
    const access_key_id = core.getInput('access_key_id');
    core.info(`Running with ${access_key_id} ...`);

    const ami_id = core.getInput('ami_id');
    core.info(`Running with ${ami_id} ...`);

    const aws_region = core.getInput('aws_region');
    core.info(`Running with ${aws_region} ...`);

    const iam_role = core.getInput('iam_role');
    core.info(`Running with ${iam_role} ...`);

    const instance_id = core.getInput('instance_id');
    core.info(`Running with ${instance_id} ...`);

    const instance_type = core.getInput('instance_type');
    core.info(`Running with ${instance_type} ...`);

    const s3_bucket_name = core.getInput('s3_bucket_name');
    core.info(`Running with ${s3_bucket_name} ...`);

    const secret_access_key = core.getInput('secret_access_key');
    core.info(`Running with ${secret_access_key} ...`);

    const session_token = core.getInput('session_token');
    core.info(`Running with ${session_token} ...`);

    const security_group_id = core.getInput('security_group_id');
    core.info(`Running with ${security_group_id} ...`);

    const ssh_key_name = core.getInput('ssh_key_name');
    core.info(`Running with ${ssh_key_name} ...`);

    const subnet_id = core.getInput('subnet_id');
    core.info(`Running with ${subnet_id} ...`);

    const terminate_ec2_instance = core.getInput('terminate_ec2_instance');
    core.info(`Running with ${terminate_ec2_instance} ...`);

    const vht_in = core.getInput('vht_in');
    core.info(`Running with ${vht_in} ...`);

    await amirun( access_key_id,
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
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
