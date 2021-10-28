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

You can now consume the action by referencing the v1 branch

```yaml
uses: Arm-Software/VHT-AMI@v1
with:
  vht_in:
  instance_id: ${{ secrets.AWS_INSTANCE_ID }}
  instance_id: ${{ env.EC2_INSTANCE_ID }}
  aws_region: ${{ env. AWS_DEFAULT_REGION }}
  s3_bucket_name: ${{ env.AWS_S3_BUCKET }}
  access_key_id: ${{ secrets.AWS_ACCESS_KEY_ID }}
  secret_key_id: ${{ secrets.AWS_SECRET_KEY }}
```
