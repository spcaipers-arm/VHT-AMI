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

const AVT = require("./avt.js");
var tar = require('tar')

let amirun = async function (filepath, instance_id, access_key_id, secret_key_id) {

  const avt = new AVT(filepath, instance_id, access_key_id, secret_key_id);
  var stat = await avt.getStatus();
  if (stat == true) console.log("AMI Instance is ready");
  if (stat == false) {
    console.log("AMI Instance is not ready")
    if (avt.instance_state == "stopped") {
      console.log("Stopped: Trying to start.");
      //var startstat = await avt.startInstance();      
    }
  }
  tar.create(
    {
      file: 'avt.tar'
    },
    [filepath]
  ).then(_ => { ".. tarball has been created .." });
  
  avt.pem_private = await avt.getSSHKey();
  await avt.sendFiles('avt.tar', "/home/ubuntu/avtwork/avt.tar");
  data = await avt.executeAVT();
  console.log(data)
  
  await avt.getFiles('/home/ubuntu/avtwork/out.tar', 'out.tar');
  

  //var stopstat = await avt.stopInstance();  


};

module.exports = amirun;
