# Arm Virtual Targets Runner

<p align="center">
  <a href="https://github.com/Arm-Software/AVT-AMI/actions"><img alt="javscript-action status" src="https://github.com/Arm-Software/AVT-AMI/workflows/units-test/badge.svg"></a>
</p>

This action manages connection, upload and execution of a test suite on an Arm Virtual Targets instance in Amazon EC2 services.

## Setup of AWS instance

Todo


## Describe test-suite in avt.yml

The avt.yml describes the inventory of your test suite folder.


## Usage

You can now consume the action by referencing the v1 branch

```yaml
uses: Arm-Software/AVT-AMI@v1
with:
  filepath:
  instance_id: ${{ secrets.AWS_INSTANCE_ID }}
  access_key_id: ${{ secrets.AWS_ACCESS_KEY_ID }}
  secret_key_id: ${{ secrets.AWS_SECRET_KEY_ID }}
```
