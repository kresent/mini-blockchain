const CryptoJS = require('crypto-js');
const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

const blockchainCore = require('./blockchain');

const {
	Block,
	getGenesisBlock,
	generateNextBlock,
	calculateHashForBlock,
	calculateHash,
} = blockchainCore;

const HTTP_PORT = process.env.HTTP_PORT || 3001;
const P2P_PORT = process.env.P2P_PORT || 6001;
const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

const MESSAGE_TYPE = {
	QUERY_LATEST: 0,
	QUERY_ALL: 1,
	RESPONSE_BLOCKCHAIN: 2,
};

const blockchain = [getGenesisBlock()];
const sockets = [];

function initHttpServer() {
	var app = express();
	app.use(bodyParser.json());

	app.get('/blocks', (req, res) => res.send(JSON.stringify(blockchain)));
	app.post('/mineBlock', (req, res) => {
		var newBlock = generateNextBlock(req.body.data, getLatestBlock());
		addBlock(newBlock);
		emit(responseLatestMsg());
		console.log(`Block added: ${JSON.stringify(newBlock)}`);
		res.send();
	});
	app.get('/peers', (req, res) => {
		res.send(
			sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort)
		);
	});
	app.post('/addPeer', (req, res) => {
		connectToPeers([req.body.peer]);
		res.send();
	});
	app.listen(HTTP_PORT, () =>
		console.log(`Listening http on port: ${HTTP_PORT}`)
	);
}

function initP2PServer() {
	var server = new WebSocket.Server({ port: P2P_PORT });
	server.on('connection', ws => initConnection(ws));
	console.log(`listening websocket p2p port on: ${P2P_PORT}`);
}

function initConnection(ws) {
	sockets.push(ws);
	initMessageHandler(ws);
	initErrorHandler(ws);
	write(ws, queryChainLengthMsg());
}

function initMessageHandler(ws) {
	ws.on('message', data => {
		const message = JSON.parse(data);
		console.log(`Received message${JSON.stringify(message)}`);

		switch (message.type) {
			case MESSAGE_TYPE.QUERY_LATEST:
				write(ws, responseLatestMsg());
				break;
			case MESSAGE_TYPE.QUERY_ALL:
				write(ws, responseChainMsg());
				break;
			case MESSAGE_TYPE.RESPONSE_BLOCKCHAIN:
				handleBlockchainResponse(message);
				break;
		}
	});
}

function initErrorHandler(ws) {
	var closeConnection = ws => {
		console.log(`Connection failed to peer: ${ws.url}`);
		sockets.splice(sockets.indexOf(ws), 1);
	};
	ws.on('close', () => closeConnection(ws));
	ws.on('error', () => closeConnection(ws));
}

function addBlock(newBlock) {
	if (isValidNewBlock(newBlock, getLatestBlock())) {
		blockchain.push(newBlock);
	}
}

function isValidNewBlock(newBlock, previousBlock) {
	if (previousBlock.index + 1 !== newBlock.index) {
		console.log('invalid index');
		return false;
	} else if (previousBlock.hash !== newBlock.previousHash) {
		console.log('invalid previoushash');
		return false;
	} else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
		console.log(
			typeof newBlock.hash + ' ' + typeof calculateHashForBlock(newBlock)
		);
		console.log(
			`Invalid hash: ${calculateHashForBlock(newBlock)} ${newBlock.hash}`
		);
		return false;
	}
	return true;
}

function connectToPeers(newPeers) {
	newPeers.forEach(peer => {
		const ws = new WebSocket(peer);
		ws.on('open', () => initConnection(ws));
		ws.on('error', () => {
			console.log('connection failed');
		});
	});
}

function handleBlockchainResponse(message) {
	const receivedBlocks = JSON.parse(message.data).sort(
		(b1, b2) => b1.index - b2.index
	);
	const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
	const latestBlockHeld = getLatestBlock();

	if (latestBlockReceived.index > latestBlockHeld.index) {
		console.log(
			`Blockchain possibly behind. We got: ${latestBlockHeld.index} Peer got: ${latestBlockReceived.index}`
		);
		if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
			console.log('Appending received block to our chain');
			blockchain.push(latestBlockReceived);
			emit(responseLatestMsg());
		} else if (receivedBlocks.length === 1) {
			console.log('We have to query the chain from our peer');
			emit(queryAllMsg());
		} else {
			console.log('Received blockchain is longer than current blockchain');
			replaceChain(receivedBlocks);
		}
	} else {
		console.log(
			'Received blockchain is not longer than current blockchain. Do nothing'
		);
	}
}

function replaceChain(newBlocks) {
	if (isValidChain(newBlocks) && newBlocks.length > blockchain.length) {
		console.log('Received blockchain is valid. Replacing current blockchain with received');
		blockchain = newBlocks;
		emit(responseLatestMsg());
	} else {
		console.log('Received blockchain invalid');
	}
}

const getLatestBlock = () => blockchain[blockchain.length - 1];
const queryChainLengthMsg = () => ({ type: MESSAGE_TYPE.QUERY_LATEST });
const queryAllMsg = () => ({ type: MESSAGE_TYPE.QUERY_ALL });
const responseChainMsg = () => ({
	type: MESSAGE_TYPE.RESPONSE_BLOCKCHAIN,
	data: JSON.stringify(blockchain),
});
const responseLatestMsg = () => ({
	type: MESSAGE_TYPE.RESPONSE_BLOCKCHAIN,
	data: JSON.stringify([getLatestBlock()]),
});
const write = (ws, message) => ws.send(JSON.stringify(message));
const emit = message => sockets.forEach(socket => write(socket, message));

connectToPeers(initialPeers);
initHttpServer();
initP2PServer();
