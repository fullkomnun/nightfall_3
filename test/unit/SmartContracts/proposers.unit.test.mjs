import { expect } from 'chai';
import hardhat from 'hardhat';

const { ethers, upgrades } = hardhat;

describe('Proposers contract Proposers functions', function () {
  let ProposersInstance;
  let addr1;
  let addr2;
  let state;
  let sanctionedSigner;

  before(async () => {
    const owner = await ethers.getSigners();
    [, , , , sanctionedSigner] = owner;
  });

  beforeEach(async () => {
    [addr1, addr2] = await ethers.getSigners();

    const Proposers = await ethers.getContractFactory('Proposers');
    ProposersInstance = await upgrades.deployProxy(Proposers, []);
    await ProposersInstance.waitForDeployment();

    const Verifier = await ethers.getContractFactory('Verifier');
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    const Poseidon = await ethers.getContractFactory('Poseidon');
    const poseidon = await Poseidon.deploy();
    await poseidon.waitForDeployment();

    const MerkleTree = await ethers.getContractFactory('MerkleTree_Stateless', {
      libraries: {
        Poseidon: await poseidon.getAddress(),
      },
    });
    const merkleTree = await MerkleTree.deploy();
    await merkleTree.waitForDeployment();

    const ChallengesUtil = await ethers.getContractFactory('ChallengesUtil', {
      libraries: {
        MerkleTree_Stateless: await merkleTree.getAddress(),
      },
    });
    const challengesUtil = await ChallengesUtil.deploy();
    await challengesUtil.waitForDeployment();

    const Utils = await ethers.getContractFactory('Utils');
    const utils = await Utils.deploy();
    await utils.waitForDeployment();

    const Challenges = await ethers.getContractFactory('Challenges', {
      libraries: {
        Verifier: await verifier.getAddress(),
        ChallengesUtil: await challengesUtil.getAddress(),
        Utils: await utils.getAddress(),
      },
    });
    const challenges = await upgrades.deployProxy(Challenges, [], {
      unsafeAllow: ['external-library-linking'],
    });
    await challenges.waitForDeployment();

    const X509 = await ethers.getContractFactory('X509');
    const x509 = await upgrades.deployProxy(X509, []);
    await x509.enableWhitelisting(false);

    const SanctionsListMockDeployer = await ethers.getContractFactory('SanctionsListMock');
    const sanctionsListMockInstance = await SanctionsListMockDeployer.deploy(
      sanctionedSigner.address,
    );
    const sanctionsListAddress = await sanctionsListMockInstance.getAddress();

    const Shield = await ethers.getContractFactory('Shield');
    const shield = await upgrades.deployProxy(Shield, [], {
      initializer: 'initializeState',
    });
    await shield.waitForDeployment();

    const State = await ethers.getContractFactory('State', {
      libraries: {
        Utils: await utils.getAddress(),
      },
    });
    state = await upgrades.deployProxy(
      State,
      [
        await ProposersInstance.getAddress(),
        await challenges.getAddress(),
        await shield.getAddress(),
      ],
      {
        unsafeAllow: ['external-library-linking'],
        initializer: 'initializeState',
      },
    );
    await state.waitForDeployment();

    await ProposersInstance.setStateContract(await state.getAddress());
    await ProposersInstance.setAuthorities(sanctionsListAddress, await x509.getAddress());
  });

  afterEach(async () => {
    // clear down the test network after each test
    await hardhat.network.provider.send('hardhat_reset');
  });

  it('should fail because of minimumStake', async function () {
    await expect(ProposersInstance.registerProposer('url', 100, { value: 1 })).to.be.revertedWith(
      'Proposers: Need minimumStake',
    );
  });

  it('should register proposer', async function () {
    const newUrl = 'url';
    const newFee = 100;
    const newStake = 2000000n;

    const numProposers = await state.getNumProposers();

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);
    const TimeLockedStakeBefore = await state.stakeAccounts(addr1.address);
    const registerProposerTx = await ProposersInstance.registerProposer(newUrl, newFee, {
      value: newStake,
    });
    const receiptRegister = await registerProposerTx.wait();
    const TimeLockedStakeUpdated = await state.stakeAccounts(addr1.address);
    const LinkedAddress = await state.proposers(addr1.address);

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    expect(LinkedAddress.url).to.equal(newUrl);
    expect(LinkedAddress.fee).to.equal(newFee);
    expect(LinkedAddress.thisAddress).to.equal(addr1.address);

    expect(TimeLockedStakeUpdated.amount).to.equal(TimeLockedStakeBefore.amount + newStake);

    expect(await state.getNumProposers()).to.equal(numProposers + 1n);
  });

  it('should not register an already registered proposer', async function () {
    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    await expect(
      ProposersInstance.registerProposer('url', 100, { value: 1000000 }),
    ).to.be.revertedWith('Proposers: This proposer is already registered');
  });

  it('should fire: Max number of registered proposers', async function () {
    const maxProposers = await ProposersInstance.getMaxProposers();
    await ProposersInstance.setMaxProposers(1);
    expect(await ProposersInstance.getMaxProposers()).to.equal(1);
    expect(await ProposersInstance.getMaxProposers()).to.not.equal(maxProposers);

    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    await expect(
      ProposersInstance.registerProposer('url', 100, { value: 1000000 }),
    ).to.be.revertedWith('Proposers: Max number of registered proposers');
  });

  it('should register two different proposer', async function () {
    const newUrl = 'url';
    const newFee = 100;
    const newStake = 3000000n;

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);
    expect((await state.getProposer(addr2.address)).thisAddress).to.equal(ethers.ZeroAddress);

    const numProposers = await state.getNumProposers();

    const TimeLockedStakeBefore = await state.stakeAccounts(addr1.address);
    const registerProposerTx = await ProposersInstance.registerProposer(newUrl, newFee, {
      value: newStake,
    });
    const receiptRegister = await registerProposerTx.wait();
    const TimeLockedStakeUpdated = await state.stakeAccounts(addr1.address);
    const LinkedAddress = await state.proposers(addr1.address);

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    expect(LinkedAddress.url).to.equal(newUrl);
    expect(LinkedAddress.fee).to.equal(newFee);
    expect(LinkedAddress.thisAddress).to.equal(addr1.address);

    expect(TimeLockedStakeUpdated.amount).to.equal(TimeLockedStakeBefore.amount + newStake);

    expect(await state.getNumProposers()).to.equal(numProposers + 1n);

    const numProposers2 = await state.getNumProposers();

    const TimeLockedStakeBefore2 = await state.stakeAccounts(addr2.address);
    const addr2registerProposerTx = await ProposersInstance.connect(addr2).registerProposer(
      newUrl,
      newFee,
      { value: newStake },
    );
    const addr2receiptRegister = await addr2registerProposerTx.wait();

    const TimeLockedStakeUpdated2 = await state.stakeAccounts(addr2.address);
    const LinkedAddress2 = await state.proposers(addr2.address);

    const addr2eventTransfer = addr2receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    expect(addr2eventTransfer).to.be.an('undefined'); // no event fired

    expect((await state.getProposer(addr2.address)).thisAddress).to.equal(addr2.address);

    expect(LinkedAddress2.url).to.equal(newUrl);
    expect(LinkedAddress2.fee).to.equal(newFee);
    expect(LinkedAddress2.thisAddress).to.equal(addr2.address);

    expect(TimeLockedStakeUpdated2.amount).to.equal(TimeLockedStakeBefore2.amount + newStake);

    expect(await state.getNumProposers()).to.equal(numProposers2 + 1n);
  });

  it('should deregister a proposer', async function () {
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);

    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    await ProposersInstance.deRegisterProposer();

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);
  });

  it('should not deregister a non existing proposer', async function () {
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);

    await expect(ProposersInstance.deRegisterProposer()).to.be.revertedWith(
      'Proposers: Not a proposer',
    );
  });

  it('should not withdrawStake as a proposer', async function () {
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);
    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    await expect(ProposersInstance.withdrawStake()).to.be.revertedWith(
      'Proposers: Cannot withdraw while staking as proposer',
    );
  });

  it('should not withdrawStake: Too soon to withdraw the stake', async function () {
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);
    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    await ProposersInstance.deRegisterProposer();

    await expect(ProposersInstance.withdrawStake()).to.be.revertedWith(
      'Proposers: Too soon to withdraw the stake',
    );
  });

  it('should withdrawStake', async function () {
    const network = await ethers.provider.getNetwork();
    console.log('Network chain id=', network.chainId);
    if (network.chainId === 31337 || network.chainId === 1337) {
      expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);
      const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
        value: 1000000,
      });
      const receiptRegister = await registerProposerTx.wait();

      const eventTransfer = receiptRegister.logs.find(
        event => event.eventName === 'NewCurrentProposer',
      );
      const [proposer] = eventTransfer.args;

      expect(proposer).to.equal(addr1.address);

      expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

      await ProposersInstance.deRegisterProposer();

      await ethers.provider.send('evm_increaseTime', [604800]); // + 1 week
      await ethers.provider.send('evm_mine');

      const TimeLockedStakeBefore = await state.stakeAccounts(addr1.address);

      await ProposersInstance.withdrawStake();

      expect((await state.stakeAccounts(addr1.address)).amount).to.equal(0);

      expect((await state.pendingWithdrawalsFees(addr1.address)).feesL1).to.equal(
        TimeLockedStakeBefore.amount + TimeLockedStakeBefore.challengeLocked,
      );
      expect((await state.pendingWithdrawalsFees(addr1.address)).feesL2).to.equal(0);
    } else {
      console.log('Test skipped');
    }
  });

  it('should not updateProposer if you are not a proposer', async function () {
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);

    await expect(ProposersInstance.updateProposer('url1', 1000)).to.be.revertedWith(
      'Proposers: This proposer is not registered or you are not that proposer',
    );

    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);

    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    await expect(ProposersInstance.connect(addr2).updateProposer('url1', 1000)).to.be.revertedWith(
      'Proposers: This proposer is not registered or you are not that proposer',
    );
  });

  it('should updateProposer without stake increment', async function () {
    const newUrl = 'url1';
    const newFee = 1000;
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);

    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    await ProposersInstance.updateProposer(newUrl, newFee);
    const LinkedAddress = await state.proposers(addr1.address);

    expect(LinkedAddress.url).to.equal(newUrl);
    expect(LinkedAddress.fee).to.equal(newFee);
    expect(LinkedAddress.thisAddress).to.equal(addr1.address);
  });

  it('should updateProposer with stake increment', async function () {
    const newUrl = 'url1';
    const newFee = 1000;
    const newStake = 500n;
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(ethers.ZeroAddress);

    const registerProposerTx = await ProposersInstance.registerProposer('url', 100, {
      value: 1000000,
    });
    const receiptRegister = await registerProposerTx.wait();

    const eventTransfer = receiptRegister.logs.find(
      event => event.eventName === 'NewCurrentProposer',
    );
    const [proposer] = eventTransfer.args;

    expect(proposer).to.equal(addr1.address);
    expect((await state.getProposer(addr1.address)).thisAddress).to.equal(addr1.address);

    const TimeLockedStakeBefore = await state.stakeAccounts(addr1.address);
    await ProposersInstance.updateProposer(newUrl, newFee, { value: newStake });
    const LinkedAddress = await state.proposers(addr1.address);
    const TimeLockedStakeUpdated = await state.stakeAccounts(addr1.address);

    expect(LinkedAddress.url).to.equal(newUrl);
    expect(LinkedAddress.fee).to.equal(newFee);
    expect(LinkedAddress.thisAddress).to.equal(addr1.address);

    expect(TimeLockedStakeUpdated.amount).to.equal(TimeLockedStakeBefore.amount + newStake);
  });
});
