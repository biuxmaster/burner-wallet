"use strict";
const express = require('express');
const helmet = require('helmet');
const app = express();
const fs = require('fs');
const ContractLoader = function(contractList,web3){
  let contracts = []
  for(let c in contractList){
    try{
      let abi = require("./src/contracts/"+contractList[c]+".abi.js")
      let address = require("./src/contracts/"+contractList[c]+".address.js")
      console.log(contractList[c],address,abi.length)
      contracts[contractList[c]] = new web3.eth.Contract(abi,address)
      console.log("contract")
      contracts[contractList[c]].blockNumber = require("./src/contracts/"+contractList[c]+".blocknumber.js")
      console.log("@ Block",contracts[contractList[c]].blockNumber)
    }catch(e){console.log(e)}
  }
  return contracts
}

var bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(helmet());
var cors = require('cors')
app.use(cors())
let contracts;
var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://0.0.0.0:8545'));

let transactions = {}

const DESKTOPMINERACCOUNT = 3 //index in geth

let accounts
web3.eth.getAccounts().then((_accounts)=>{
  accounts=_accounts
  console.log("ACCOUNTS",accounts)
})

console.log("LOADING CONTRACTS")
contracts = ContractLoader(["Links"],web3);


app.get('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/")
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify({hello:"world"}));

});

app.get('/miner', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/miner")
  res.set('Content-Type', 'application/json');
  res.end(JSON.stringify({address:accounts[DESKTOPMINERACCOUNT]}));
});

app.post('/link', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("/link",req.body)


  let validClaim = await contracts.Links.methods.isClaimValid(req.body.id,req.body.sig,req.body.dest).call()

  if(!validClaim){
    console.log("INVALID CLAIM!!!!")
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify({invalid:"claim"}));
  }else{
    console.log("CLAIM IS VALID...")
    let txparams = {
      from: accounts[DESKTOPMINERACCOUNT],
      gas: 100000,
      gasPrice:Math.round(4 * 1000000000)
    }

    console.log("PARAMS",txparams)
    contracts.Links.methods.claim(req.body.id,req.body.sig,req.body.dest).send(
      txparams ,(error, transactionHash)=>{
        console.log("TX CALLBACK",error,transactionHash)
        res.set('Content-Type', 'application/json');
        res.end(JSON.stringify({transactionHash:transactionHash}));
      }
    )
    .on('error',(err,receiptMaybe)=>{
      console.log("TX ERROR",err,receiptMaybe)
    })
    .on('transactionHash',(transactionHash)=>{
      console.log("TX HASH",transactionHash)
    })
    .on('receipt',(receipt)=>{
      console.log("TX RECEIPT",receipt)
    })
    .then((receipt)=>{
      console.log("TX THEN",receipt)
    })
  }




});

app.listen(9999);
console.log(`http listening on 9999`);