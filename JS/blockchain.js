'use strict';
const CryptoJS = require('crypto-js');

const GENESIS_CONTENT = {
  index: 0,
  previousHash: '0',
  timestamp: 1528214400,
  data: 'Genesis block',
};

class Block {
  constructor({ index, previousHash, timestamp, data, hash }) {
    this.index = index;
    this.previousHash = previousHash.toString();
    this.timestamp = timestamp;
    this.data = data;
    this.hash = hash.toString();
  }
}

const getGenesisBlock = () => {
  return new Block({
    index: GENESIS_CONTENT.index,
    previousHash: GENESIS_CONTENT.previousHash,
    timestamp: GENESIS_CONTENT.timestamp,
    data: GENESIS_CONTENT.data,
    hash: calculateHash(GENESIS_CONTENT),
  });
};

const generateNextBlock = (blockData, previousBlock) => {
  const nextIndex = previousBlock.index + 1;
  const nextTimestamp = new Date().getTime() / 1000;
  const nextHash = calculateHash({
    index: nextIndex,
    previousHash: previousBlock.hash,
    timestamp: nextTimestamp,
    data: blockData,
  });

  return new Block({
    index: nextIndex,
    previousHash: previousBlock.hash,
    timestamp: nextTimestamp,
    data: blockData,
    hash: nextHash,
  });
};

const calculateHashForBlock = (block, hashFn = calculateHash) => {
  return hashFn({
    index: block.index,
    previousHash: block.previousHash,
    timestamp: block.timestamp,
    data: block.data,
  });
};

const calculateHash = ({ index, previousHash, timestamp, data }) => {
  return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

module.exports = {
  Block,
  getGenesisBlock,
  generateNextBlock,
  calculateHashForBlock,
  calculateHash,
};
