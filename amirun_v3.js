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
var tar = require('tar')

let amirun = async function (filepath, instance_id, access_key_id, secret_key_id) {

  const vht = new VHT(filepath, instance_id, access_key_id, secret_key_id);
  var stat = await vht.getStatus();
  if (stat == true) console.log("AMI Instance is ready");
  if (stat == false) {
    console.log("AMI Instance is not ready")
    if (vht.instance_state == "stopped") {
      console.log("Stopped: Trying to start.");
      var startstat = await vht.startInstance();      
    }
  }
  console.log("Working on directory (vht_in): ", filepath)
  console.log("cwd= ", process.cwd())
  tar.create(
    {
      file: 'vht.tar'
    },
    [filepath]
  ).then(_ => { ".. tarball has been created .." });
  
  vht.pem_private = await vht.getSSHKey();
  await vht.sendFiles('vht.tar', "/home/ubuntu/vhtwork");
  data = await vht.executeVHT();
  console.log(data)
  
  await vht.getFiles('/home/ubuntu/vhtwork/out.tar', 'out.tar');
  
  tar.extract(
    {
      file: './out.tar',
      gzip: true
    },
    ["./result"]
  ).then(_ => { ".. tarball has been extracted .." });
  

  //var stopstat = await vht.stopInstance();  

};

module.exports = amirun;
