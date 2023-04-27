import fs from 'fs';
import { copyDir } from './adversary-code/utils.mjs';

// Transpile Block Code that makes a block
const transpileBlockAssembler = (_pathToSrc, _pathToInject) => {
  let srcFile = fs.readFileSync(_pathToSrc, 'utf-8');
  srcFile = `/* THIS FILE CONTAINS CODE THAT HAS BEEN AUTOGENERATED DO NOT MODIFY MANUALLY */\n${srcFile}`;

  // Modify make Block now function to also set badBlockType
  const regexReplaceSetMakeNowFunction =
    /export function setMakeNow\(_makeNow = true\) {\n(\s)*makeNow = _makeNow;\n(\s)*}/g;
  const reSetMakeNowFunction = `let badBlockType = '';
  export function setMakeNow(_makeNow = true, _badBlockType = '') { 
    makeNow = _makeNow;
    badBlockType = _badBlockType;
  }`;
  srcFile = srcFile.replace(regexReplaceSetMakeNowFunction, reSetMakeNowFunction);

  // Add generalise package import
  const regexImportGeneralise = /let ws;/g;
  const reImportGeneralise = `let ws;
  import gen from 'general-number';
  const { generalise } = gen;`;

  srcFile = srcFile.replace(regexImportGeneralise, reImportGeneralise);

  // Inject duplicate transactions bad block type
  const injectDuplicateTransaction = `if(badBlockType === 'DuplicateTransaction') {
    const index = Math.floor(Math.random() * transactions.length);
    transactions.push(transactions[index]);
  }`;
  let srcTxDataToSignPreamble = /(\n|.)*(?=const block = await makeBlock)/g;
  let srcTxDataToSignPostamble = /const block = await makeBlock(\n|.)*/g;
  let [srcPre] = srcFile.match(srcTxDataToSignPreamble);
  let [srcPost] = srcFile.match(srcTxDataToSignPostamble);
  srcFile = `${srcPre}\n${injectDuplicateTransaction}\n${srcPost}`;

  // Inject incorrect root, incorrect leaf and incorrect frontier hash bad block type
  const injectBadBlocks = fs.readFileSync(_pathToInject, 'utf-8');
  srcTxDataToSignPreamble = /(\n|.)*(?=const unsignedProposeBlockTransaction = await \()/g;
  srcTxDataToSignPostamble = /let count = 0;(\n|.)*/g;
  [srcPre] = srcFile.match(srcTxDataToSignPreamble);
  [srcPost] = srcFile.match(srcTxDataToSignPostamble);
  srcFile = `${srcPre}\n${injectBadBlocks}\n${srcPost}`;

  fs.writeFileSync(_pathToSrc, srcFile);
};

// Transpile Block API code
const transpileBlockApi = _pathToSrc => {
  let srcFile = fs.readFileSync(_pathToSrc, 'utf-8');
  srcFile = `/* THIS FILE CONTAINS CODE THAT HAS BEEN AUTOGENERATED DO NOT MODIFY MANUALLY */\n${srcFile}`;

  // Modify make-now route so that we can pass bad block type as a parameter
  const injectCustomMakeNow = `router.post('/make-now/:badBlockType?', async (req, res, next) => {
    try {
      logger.debug('block make-now endpoint received GET');
      const { badBlockType } = req.params;
      if(badBlockType) {
        logger.debug(\`making block with the following bad Block Type: \${badBlockType}\`);
      }
      setMakeNow(true, badBlockType);
      res.send('Making short block');
    } catch (err) {
      next(err);
    }
  });`;
  const srcTxDataToSignPreamble = /(\n|.)*(?=router.post\('\/make-now',)/g;
  const srcTxDataToSignPostamble = /router.post\('\/block-time(\n|.)*/g;
  const [srcPre] = srcFile.match(srcTxDataToSignPreamble);
  const [srcPost] = srcFile.match(srcTxDataToSignPostamble);
  srcFile = `${srcPre}\n${injectCustomMakeNow}\n${srcPost}`;

  fs.writeFileSync(_pathToSrc, srcFile);
};

// transpile to comment out checkTransaction function call
const transpileTransactionSubmitEventHandler = _pathToSrc => {
  let srcFile = fs.readFileSync(_pathToSrc, 'utf-8');
  srcFile = `/* THIS FILE CONTAINS CODE THAT HAS BEEN AUTOGENERATED DO NOT MODIFY MANUALLY */\n${srcFile}`;
  // Remove transaction check from the optimist so that bad transactions can be added into a blocks

  const srcTxDataToSignPreamble = /(\n|.)*(?=await checkTransaction)/g;
  const srcTxDataToSignPostamble = /\s*try\s*{\n\s+?await saveTransaction(\n|.)*/g;
  const [srcPre] = srcFile.match(srcTxDataToSignPreamble);
  const [srcPost] = srcFile.match(srcTxDataToSignPostamble);
  srcFile = `${srcPre}\n${srcPost}`;

  fs.writeFileSync(_pathToSrc, srcFile);
};

// transpile to comment out checkBlock function call
const transpileBlockProposedEventHandler = _pathToSrc => {
  let srcFile = fs.readFileSync(_pathToSrc, 'utf-8');
  srcFile = `/* THIS FILE CONTAINS CODE THAT HAS BEEN AUTOGENERATED DO NOT MODIFY MANUALLY */\n${srcFile}`;
  // Remove transaction check from the optimist so that bad transactions can be added into a blocks

  const regexCommentCheckBlock = /await checkBlock\(block, transactions\);/g;
  const reCommentCheckBlock = `// await checkBlock(block, transactions);`;
  srcFile = srcFile.replace(regexCommentCheckBlock, reCommentCheckBlock);

  fs.writeFileSync(_pathToSrc, srcFile);
};

// Transpile Adversary controller
const transpileAdversaryController = _pathToSrc => {
  let srcFile = fs.readFileSync(_pathToSrc, 'utf-8');
  srcFile = `/* THIS FILE CONTAINS CODE THAT HAS BEEN AUTOGENERATED DO NOT MODIFY MANUALLY */\n${srcFile}`;

  // Modify make Block now function to also set badBlockType
  const regexReplaceAdversaryControllerFunction = /app.listen\(80\);/g;
  const reSetAdversaryControllerFunction = `app.listen(80);
  adversaryController();`;
  srcFile = srcFile.replace(
    regexReplaceAdversaryControllerFunction,
    reSetAdversaryControllerFunction,
  );

  // Add generalise package import
  const regexImportAdversaryController = /const main = async \(\) => {/g;
  const reImportAdversaryController = `import adversaryController from './services/lazy-adversary-controller.mjs';
  const main = async() => {`;

  srcFile = srcFile.replace(regexImportAdversaryController, reImportAdversaryController);

  fs.writeFileSync(_pathToSrc, srcFile);
};

// Copy adversary controller service
const copyAdversaryController = (_pathToSrc, _pathToInject) => {
  let srcFile = fs.readFileSync(_pathToSrc, 'utf-8');
  srcFile = `/* THIS FILE CONTAINS CODE THAT HAS BEEN AUTOGENERATED DO NOT MODIFY MANUALLY */\n${srcFile}`;

  fs.writeFileSync(_pathToInject, srcFile);
};

copyDir('./nightfall-optimist/', './test/adversary/lazy-optimist/').then(() => {
  console.log('done with optimist copy');

  transpileBlockAssembler(
    './test/adversary/lazy-optimist/src/services/block-assembler.mjs',
    './test/adversary/adversary-code/block-assembler.mjs',
  );

  transpileBlockApi(
    './test/adversary/lazy-optimist/src/routes/block.mjs',
    './test/adversary/adversary-code/route-block.mjs',
  );

  transpileTransactionSubmitEventHandler(
    './test/adversary/lazy-optimist/src/event-handlers/transaction-submitted.mjs',
  );

  transpileBlockProposedEventHandler(
    './test/adversary/lazy-optimist/src/event-handlers/block-proposed.mjs',
  );

  transpileAdversaryController('./test/adversary/lazy-optimist/src/index.mjs');

  copyAdversaryController(
    './test/adversary/adversary-code/lazy-adversary-controller.mjs',
    './test/adversary/lazy-optimist/src/services/lazy-adversary-controller.mjs',
  );

  console.log(`transpile adversary optimist done`);
});
