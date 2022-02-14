#######################################################################################
# MIT License
#
# Copyright (c) 2021 Arm Ltd.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#######################################################################################

from parser import suite
import yaml
import os
import shutil
import shlex
import logging
import sys
import subprocess

# Logging
verbosity = 'INFO'
level = { "DEBUG": 10, "INFO": 20, "WARNING" : 30, "ERROR" : 40 }
logging.basicConfig(format='[%(levelname)s]\t%(message)s', level = verbosity)
logging.debug("Verbosity level is set to " + verbosity)

inventory_file = "./vht.yml"

def _execute(command, shell=False):
  command = shlex.split(command)
  print(f"Running _execute command: {command}")
  process = subprocess.run(command,
                           stderr=subprocess.PIPE,
                           stdout=subprocess.PIPE,
                           shell=shell)

  print(process.stdout.decode('utf-8').strip())
  print(process.stderr.decode('utf-8').strip())
  if (process.returncode != 0):
    logging.error(f"Command `{command}` failed with error code `{process.returncode}`")
    sys.exit(process.returncode)

  return process.stdout.decode('utf-8').strip()

def main():
    dir = "/home/ubuntu/vhtwork/"
    os.chdir(dir)
    for files in os.listdir(dir):
        path = os.path.join(dir, files)
        try:
            if path != "/home/ubuntu/vhtwork/vht.tar":
                shutil.rmtree(path)
        except OSError:
            os.remove(path)

    _execute("sudo tar xvf /home/ubuntu/vhtwork/vht.tar --strip-components=2")
    _execute("sudo chown -R ubuntu:ubuntu /home/ubuntu/vhtwork")
    _execute ("mkdir -p ./out")
    with open(os.path.abspath(inventory_file), "r") as ymlfile:
        inventory = yaml.safe_load(ymlfile)
        print("Reading inventory yaml: vht.yml")
        for key, value in inventory.items():
            suite_name = value['name']
            print("Suite name: ", suite_name)
            fvp_executable = value['model']
            print("Model Executable: ", fvp_executable)
            fvp_config = value['configuration']
            print("Model Configuration: ", fvp_config)
            working_dir = value['working_dir']
            print("Working Directory: ", working_dir)
            os.chdir(working_dir)
            print("Current Directory: ", os.getcwd())
            pre_suite_execute = value['pre']
            if pre_suite_execute != "":
              print("Pre-run execution: ", pre_suite_execute)
              _execute(pre_suite_execute, shell=True)
            post_suite_execute = value['post']
            if post_suite_execute != "":
              print("Post-run execution: ", post_suite_execute)
              _execute(post_suite_execute)

            print("Reading Builds: ")
            for build in value['builds']:
                buildname = [key for key in build.keys()][0]
                print("Build name: ", buildname)
                shell_command = build[buildname]["shell"]
                print("Executing Build command: ", shell_command)
                result = _execute(shell_command)
                print(result)
                post_build_execute = build[buildname]["post"]
                if post_build_execute != "":
                  print("Post-build execution: ", post_build_execute)
                  _execute(post_build_execute)

            print("Reading Tests: ")
            for test in value['tests']:
                testname = [key for key in test.keys()][0]
                print("Test name: ", testname)

                executable_name = test[testname]["executable"]
                print(executable_name)

                arguments = test[testname]["arguments"]
                print("Additional FVP options: ", arguments)

                pre_test_execute = test[testname]["pre"]
                if pre_test_execute != "":
                  print("Pre-run execution: ", pre_test_execute)
                  _execute(pre_test_execute)
                head, executable_base_name = os.path.split(executable_name)
                model_command = f"{fvp_executable} {arguments} {executable_name}"
                print(model_command)
                stdout = _execute(model_command)

                with open(f"/home/ubuntu/vhtwork/out/{executable_base_name}.stdio", 'w') as file:
                  file.write(stdout)

                post_test_execute = test[testname]["post"]
                if post_test_execute != "":
                  print("Post-run execution: ", post_test_execute)
                  _execute(post_test_execute)

    _execute("tar -zcvf /home/ubuntu/vhtwork/out.tar /home/ubuntu/vhtwork/out/")

if __name__ == '__main__':
    main()
