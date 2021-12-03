# Arm Virtual Hardware - GitHub Action

<p align="center">
  <a href="https://github.com/Arm-Software/VHT-AMI/actions"><img alt="javscript-action status" src="https://github.com/Arm-Software/VHT-AMI/workflows/units-test/badge.svg"></a>
</p>

This action manages connection, upload and execution of a test suite using a [GitHub-hosted Runner](https://arm-software.github.io/VHT/main/infrastructure/html/run_ami_github.html#GitHub_hosted). It connects to the Arm Virtual Hardware Service on AWS that is provided by an [Amazon Machine Image](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html) (AMI) and executes on a AWS EC2 Linux instance.

## Setup of AWS instance

Todo


## Describe test-suite in vht.yml

The vht.yml describes the inventory of your test suite folder.


## Usage

You can now consume the action by referencing the v1 branch.

Mandatory inputs for already created EC2 Instance:
```yaml
uses: Arm-Software/VHT-AMI@v1
with:
  access_key_id: ${{ secrets.ACCESS_KEY_ID }}
  aws_region: ${{ secrets.AWS_DEFAULT_REGION }}
  instance_id: ${{ env.AWS_INSTANCE_ID }}
  s3_bucket_name: ${{ secrets.AWS_S3_BUCKET }}
  vht_in: ./vht/

```

Inputs for EC2 instance to be created:
```yaml
uses: Arm-Software/VHT-AMI@v1
with:
  access_key_id: ${{ secrets.ACCESS_KEY_ID }}
  ami_id: ${{ secrets.AMI_ID }}
  aws_region: ${{ secrets.AWS_DEFAULT_REGION }}
  iam_role: ${{ secrets.IAM_ROLE }}
  instance_type: t2.micro // ['t2.micro' as Default]
  s3_bucket_name: ${{ secrets.AWS_S3_BUCKET }}
  secret_access_key: ${{ secrets.AWS_ACCESS_KEY_SECRET }}
  security_group_id: ${{ secrets.SECURITY_GROUP_ID }}
  session_token: '' // [Optional] ['' as Default]
  ssh_key_name: common // [Optional] ['' as Default]
  subnet_id: ${{ secrets.SUBNET_ID }}
  terminate_ec2_instance: true // [Optional] ['false' as Default]
  vht_in: ./basic/
```
