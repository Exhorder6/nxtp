/* eslint-disable prefer-const */
import { BigInt } from "@graphprotocol/graph-ts";

import {
  TransactionManager,
  LiquidityAdded,
  LiquidityRemoved,
  TransactionCancelled,
  TransactionFulfilled,
  TransactionPrepared,
} from "../generated/TransactionManager/TransactionManager";
import { Transaction, AssetBalance, Router, User } from "../generated/schema";

/**
 * Updates the subgraph records when LiquidityAdded events are emitted. Will create a Router record if it does not exist
 *
 * @param event - The contract event to update the subgraph record with
 */
export function handleLiquidityAdded(event: LiquidityAdded): void {
  let router = Router.load(event.params.router.toHex());
  if (router == null) {
    router = new Router(event.params.router.toHex());
    router.save();
  }

  // ID is of the format ROUTER_ADDRESS-ASSET_ID
  let assetBalanceId = event.params.assetId.toHex() + "-" + event.params.router.toHex();
  let assetBalance = AssetBalance.load(assetBalanceId);
  if (assetBalance == null) {
    assetBalance = new AssetBalance(assetBalanceId);
    assetBalance.router = router.id;
    assetBalance.shares = new BigInt(0);
  }
  // add new amount
  assetBalance.shares = assetBalance!.shares.plus(event.params.amount);
  assetBalance.save();
}

/**
 * Updates the subgraph records when LiquidityRemoved events are emitted. Will create a Router record if it does not exist
 *
 * @param event - The contract event to update the subgraph record with
 */
export function handleLiquidityRemoved(event: LiquidityRemoved): void {
  let router = Router.load(event.params.router.toHex());
  if (router == null) {
    router = new Router(event.params.router.toHex());
    router.save();
  }

  // ID is of the format ROUTER_ADDRESS-ASSET_ID
  let assetBalanceId = event.params.assetId.toHex() + "-" + event.params.router.toHex();
  let assetBalance = AssetBalance.load(assetBalanceId);
  // add new amount
  assetBalance!.shares = assetBalance!.shares.minus(event.params.shares);
  assetBalance!.save();
}

/**
 * Creates subgraph records when TransactionPrepared events are emitted.
 *
 * @param event - The contract event used to create the subgraph record
 */
export function handleTransactionPrepared(event: TransactionPrepared): void {
  // load user and router
  // router should have liquidity but it may not
  let router = Router.load(event.params.txData.router.toHex());
  if (router == null) {
    router = new Router(event.params.txData.router.toHex());
    router.save();
  }

  let user = User.load(event.params.txData.router.toHex());
  if (user == null) {
    user = new User(event.params.txData.user.toHex());
    user.save();
  }

  // instantiate contract to get the chainId
  let contract = TransactionManager.bind(event.address);
  let chainId = contract.chainId();

  // cannot use only transactionId because of multipath routing, this below combo will be unique for active txs
  let transactionId =
    event.params.transactionId.toHex() + "-" + event.params.user.toHex() + "-" + event.params.router.toHex();
  // contract checks ensure that this cannot exist at this point, so we can safely create new
  // NOTE: the above case is not always true since malicious users can reuse IDs to try to break the
  // subgraph. we can protect against this by overwriting if we are able to load a Transactioln
  let transaction = Transaction.load(transactionId);
  if (transaction == null) {
    transaction = new Transaction(transactionId);
  }

  // TransactionData
  transaction.user = user.id;
  transaction.router = router.id;
  transaction.sendingAssetId = event.params.txData.sendingAssetId;
  transaction.receivingAssetId = event.params.txData.receivingAssetId;
  transaction.sendingChainFallback = event.params.txData.sendingChainFallback;
  transaction.callTo = event.params.txData.callTo;
  transaction.receivingAddress = event.params.txData.receivingAddress;
  transaction.callDataHash = event.params.txData.callDataHash;
  transaction.transactionId = event.params.txData.transactionId;
  transaction.sendingChainId = event.params.txData.sendingChainId;
  transaction.receivingChainId = event.params.txData.receivingChainId;
  transaction.expiry = event.params.txData.expiry;
  transaction.preparedBlockNumber = event.params.txData.preparedBlockNumber;

  // TransactionPrepared specific
  transaction.amount = event.params.amount;
  transaction.shares = event.params.txData.shares;
  transaction.prepareCaller = event.params.caller;
  transaction.prepareTransactionHash = event.transaction.hash;
  transaction.encryptedCallData = event.params.encryptedCallData.toHexString();
  transaction.encodedBid = event.params.encodedBid;
  transaction.bidSignature = event.params.bidSignature;

  // Meta
  transaction.status = "Prepared";
  transaction.chainId = chainId;

  transaction.save();

  // router is providing liquidity on receiver prepare
  if (chainId == transaction.receivingChainId) {
    let assetBalanceId = transaction.receivingAssetId.toHex() + "-" + event.params.router.toHex();
    let assetBalance = AssetBalance.load(assetBalanceId);
    assetBalance.shares = assetBalance.shares.minus(event.params.txData.shares);
    assetBalance.save();
  }
}

/**
 * Updates subgraph records when TransactionFulfilled events are emitted
 *
 * @param event - The contract event used to update the subgraph
 */
export function handleTransactionFulfilled(event: TransactionFulfilled): void {
  // contract checks ensure that this cannot exist at this point, so we can safely create new
  let transactionId =
    event.params.transactionId.toHex() + "-" + event.params.user.toHex() + "-" + event.params.router.toHex();
  let transaction = Transaction.load(transactionId);
  transaction!.status = "Fulfilled";
  transaction!.relayerFee = event.params.relayerFee;
  transaction!.signature = event.params.signature;
  transaction!.callData = event.params.callData.toHexString();
  transaction!.fulfillCaller = event.params.caller;
  transaction!.fulfillTransactionHash = event.transaction.hash;

  transaction!.save();

  // router receives liquidity back on sender fulfill
  if (transaction.chainId == transaction.sendingChainId) {
    let assetBalanceId = transaction.receivingAssetId.toHex() + "-" + event.params.router.toHex();
    let assetBalance = AssetBalance.load(assetBalanceId);
    if (assetBalance == null) {
      assetBalance = new AssetBalance(assetBalanceId);
      assetBalance.router = event.params.router.toHex();
      assetBalance.shares = new BigInt(0);
    }
    assetBalance.shares = assetBalance.shares.plus(event.params.txData.shares);
    assetBalance.save();
  }
}

/**
 * Updates subgraph records when TransactionCancelled events are emitted
 *
 * @param event - The contract event used to update the subgraph
 */
export function handleTransactionCancelled(event: TransactionCancelled): void {
  // contract checks ensure that this cannot exist at this point, so we can safely create new
  let transactionId =
    event.params.transactionId.toHex() + "-" + event.params.user.toHex() + "-" + event.params.router.toHex();
  let transaction = Transaction.load(transactionId);
  transaction!.status = "Cancelled";
  transaction!.relayerFee = event.params.relayerFee;
  transaction!.cancelCaller = event.params.caller;
  transaction!.cancelTransactionHash = event.transaction.hash;

  transaction!.save();

  // router receives liquidity back on receiver cancel
  if (transaction.chainId == transaction.receivingChainId) {
    let assetBalanceId = transaction.receivingAssetId.toHex() + "-" + event.params.router.toHex();
    let assetBalance = AssetBalance.load(assetBalanceId);
    if (assetBalance == null) {
      assetBalance = new AssetBalance(assetBalanceId);
      assetBalance.router = event.params.router.toHex();
      assetBalance.shares = new BigInt(0);
    }
    assetBalance.shares = assetBalance.shares.plus(event.params.txData.shares);
    assetBalance.save();
  }
}
