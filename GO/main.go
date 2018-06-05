package main

import (
	"crypto/sha256"
	"encoding/hex"
	"log"
	"time"

	"github.com/davecgh/go-spew/spew"
	"github.com/joho/godotenv"
)

// CashBlock representing a single change in user's cash
type CashBlock struct {
	Index     int
	Timestamp string
	Cash      int
	Hash      string
	PrevHash  string
}

// Blockchain for cash blocks
var Blockchain []CashBlock

func main() {
	// Load .env file config
	err := godotenv.Load()
	if err != nil {
		log.Fatal(err)
	}

	go func() {
		t := time.Now()
		genesisBlock := CashBlock{0, t.String(), 0, "", ""}
		spew.Dump(genesisBlock)
		Blockchain = append(Blockchain, genesisBlock)
	}()
	log.Fatal(run())
}

func calculateHash(block CashBlock) string {
	record := string(block.Index) + block.Timestamp + string(block.Cash) + block.PrevHash
	h := sha256.New()
	h.Write([]byte(record))
	hashed := h.Sum(nil)
	return hex.EncodeToString(hashed)
}

func generateBlock(oldBlock CashBlock, Cash int) (CashBlock, error) {
	var newBlock CashBlock

	t := time.Now()

	newBlock.Index = oldBlock.Index + 1
	newBlock.Timestamp = t.String()
	newBlock.Cash = Cash
	newBlock.PrevHash = oldBlock.Hash
	newBlock.Hash = calculateHash(newBlock)

	return newBlock, nil
}

func isBlockValid(newBlock, oldBlock CashBlock) bool {
	if oldBlock.Index+1 != newBlock.Index {
		return false
	}

	if oldBlock.Hash != newBlock.PrevHash {
		return false
	}

	if calculateHash(newBlock) != newBlock.Hash {
		return false
	}

	return true
}

func replaceChain(newBlocks []CashBlock) {
	if len(newBlocks) > len(Blockchain) {
		Blockchain = newBlocks
	}
}
