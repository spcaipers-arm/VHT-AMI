# Arm Virtual Hardware Targets - GitHub Actions

<p align="center">
  <a href="https://github.com/Arm-Software/VHT-AMI/actions"><img alt="javscript-action status" src="https://github.com/Arm-Software/VHT-AMI/workflows/units-test/badge.svg"></a>
</p>

This action manages connection, upload and execution of a test suite on an Arm VHT System that is provided by a [Amazon Machine Image](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html) (AMI) on a Amazon EC2 Linux instance.

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
  access_key_id: ${{ secrets.AWS_ACCESS_KEY_ID }}
  secret_key_id: ${{ secrets.AWS_SECRET_KEY_ID }}
```
