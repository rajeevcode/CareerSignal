"""Durable in-app reminder delivery and crashed-request reconciliation. No provider calls."""
import logging
import signal
import threading
from pathlib import Path
from app.db import get_conn

stop = threading.Event()

def tick():
    with get_conn() as conn:
        return conn.execute('SELECT public.run_career_maintenance() AS result').fetchone()['result']

def main():
    logging.basicConfig(level=logging.INFO)
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    while not stop.is_set():
        try:
            logging.info('Career maintenance: %s', tick())
            Path('/tmp/career-maintenance-heartbeat').touch()
        except Exception:
            logging.error('Career maintenance failed; will retry next interval')
        stop.wait(60)

if __name__ == '__main__':
    main()
