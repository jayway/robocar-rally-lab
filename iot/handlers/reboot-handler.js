'use strict';

const logger = require('bunyan');
const { exec } = require('child_process');

const Operation = 'reboot';

const STEP_STARTED = 'started';
const STEP_EXECUTED = 'executed';

function reportProgress(job, step) {
  job.inProgress({
    operation: Operation,
    step
  });
}

function reportSuccess(job) {
  job.succeeded({
    operation: Operation,
    step: STEP_EXECUTED
  });
}

function reportFailure(job, errorCode, error) {
  job.failed({
    operation: Operation,
    errorCode,
    error
  });
}

function reboot() {
  exec('sudo /sbin/shutdown -r', (error) => {
    if (error) {
      reportFailure('ERR_SYSTEM_CALL_FAILED', error);
    }
  });
}

function handle(error, job) {
  logger.debug({ message: 'Received new job event', job });

  function handleStep(status, step) {
    if (status === 'QUEUED' || !step) {
      logger.info({ message: 'Rebooting system' });
      reportProgress(job, STEP_STARTED);
      reboot();
    } else if (step === STEP_STARTED) {
      logger.info({ message: 'Reporting successful system reboot' });
      reportSuccess(job);
    } else {
      logger.warn({ message: 'Unexpected job state, failing...', step });
      reportFailure(job, 'ERR_UNEXPECTED', 'job in unexpected state');
    }
  }

  if (error) {
    logger.error({ message: 'Error in IoT job', error });
    return reportFailure(job, 'ERR_UNEXPECTED', 'job in unexpected state');
  }

  const { status: { status, statusDetails: { step } } } = job;
  return handleStep(status, step);
}

module.exports = {
  Operation,
  handle
};
