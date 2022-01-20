# Arm Virtual Hardware - GitHub Action
This action manages connection, upload and execution of a test suite using a [GitHub-hosted Runner](https://arm-software.github.io/VHT/main/infrastructure/html/run_ami_github.html#GitHub_hosted). It connects to the Arm Virtual Hardware Service on AWS that is provided by an [Amazon Machine Image](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html) (AMI) and executes on a AWS EC2 Linux instance.

## Setup of AWS instance
TODO: Add CloudFormation Example here.

## VHT Python Module
This VHT-AMI GitHub Actions uses VHT python module. More info:
https://github.com/ARM-software/VHT/tree/main/infrastructure/python_resources

## AWS Credentials
The AWS Credentials must be present for this actions to be able to work.
The following environment variables must be present:
```bash
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_DEFAULT_REGION
```

## Describe test-suite in vht.yml
The vht.yml describes the inventory of your test suite folder.

## Usage
You can now consume the action by referencing the v2 branch.

```yaml
uses: Arm-Software/VHT-AMI@v2
with:
  with:
    # EC2 Instance ID.
    # For example: i-0c31222f3fdc44341
    # Optional. If not present, the action will create a new VHT EC2 into your AWS account
    # Default: ''
    ec2_instance_id: ''

    # EC2 Instance Type that will be assign to-be-created EC2 Instance.
    # For example: t2.micro
    # Mandatory if field `ec2_instance_id` is NOT present.
    # Default: t2.micro
    ec2_instance_type: ''

    # EC2 Security Group that will be assign a to-be-created EC2 Instance
    # For example: sg-00389e13a7847fb1a
    # Mandatory if field `ec2_instance_id` is NOT present.
    # Default: ''
    ec2_security_group_id: ''

    # IAM Profile to be assigned a to-be-created EC2 Instance.
    # It provides permission to the EC2 instances to store objects on S3 buckets, etc.
    # For example: Proj-s3-orta-vht-role
    # Mandatory if field `ec2_instance_id` is NOT present.
    # Default: ''
    iam_profile: ''

    # S3 Bucket Name. It will be used to store VHT files and logs
    # For example: s3_dummy_name
    # Mandatory field.
    # Default: ''
    s3_bucket_name: ''

    # SSH Key Name. It can be used for debugging issues.
    # How to create a SSH Key Pair https://docs.aws.amazon.com/ground-station/latest/ug/create-ec2-ssh-key-pair.html
    # For example: my_ssh_key.
    # Default: ''
    ssh_key_name: ''

    # Subnet ID that will be assign a to-be-created EC2 Instance
    # For example: subnet-0765dcb2f43c32e51
    # Mandatory if field `ec2_instance_id` is NOT present
    # Default: ''
    subnet_id: ''

    # Terminate EC2 Instance when the build is finished
    # Optional option
    # Default: 'false'
    terminate_ec2_instance: ''

    # VHT AMI Version to be used. This field is overwritten if `vht_ami_id` field is present.
    # For example: '1.0.0'
    # Mandatory if `vht_ami_id` is NOT present
    # Default: '1.0.0'
    vht_ami_version: ''

    # VHT AMI ID when the EC2 instance has been created. This fields overwrites vht_ami_version.
    # For example: i-0fb318d8718119db9
    # Optional field
    # Default: ''
    vht_ami_id: ''

    # VHT folder which will be packed and send to the AWS
    # For example: ./basic/
    # Mandatory field
    # Default: ''
    vht_in: ''
```
