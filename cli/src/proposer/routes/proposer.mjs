/**
Routes for managing a proposer.
Some transactions are so simple that, we don't split out a separate service
module but handle the entire request here.
*/
import express from 'express';
import { nf3SendOffchainTransaction } from '../nf3-wrapper.mjs';

const router = express.Router();

router.post('/offchain-transaction', async (req, res) => {
  console.log(`Proposer/offchain-transaction endpoint received POST`);
  console.log(`With content ${JSON.stringify(req.body, null, 2)}`);
  const { transaction } = req.body;

  if (!transaction) {
    res.sendStatus(404);
    return;
  }
  await nf3SendOffchainTransaction(transaction);
  res.sendStatus(200);
});

export default router;
