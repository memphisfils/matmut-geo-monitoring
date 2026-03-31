import os
import signal
import time

import app as app_module


_keep_running = True


def _handle_signal(signum, frame):
    del signum, frame
    global _keep_running
    _keep_running = False


def main():
    os.environ.setdefault('SCHEDULER_ROLE', 'worker')
    scheduler = app_module._start_scheduler()
    if not scheduler:
        raise SystemExit(1)

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    try:
        while _keep_running:
            time.sleep(1)
    finally:
        if scheduler and getattr(scheduler, 'running', False):
            scheduler.shutdown(wait=False)


if __name__ == '__main__':
    main()
