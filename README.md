# Blockchain implementations
This project contains minimalistic blockchain implementations

## Go
Navigate to GO folder and run 
  
    go run *.go
    
GET or open in browser localhost:/8080 to see all blocks

POST to localhost:/8080 with {"Cash": 111} body adds a new block with value 111

## JS
Navigate to JS folder
run two commands separately

    HTTP_PORT=3001 P2P_PORT=6001 npm start
   
    HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start
   
GET or open browser http://localhost:3002/blocks to see all blocks

To add block 

    curl -H "Content-type:application/json" --data '{"data" : "Some data to the first block"}' http://localhost:3001/mineBlock
