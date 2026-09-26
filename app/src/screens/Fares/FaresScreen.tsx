import { useId, useState } from 'react';
import { Page } from '../../components/Page';
import { Icon } from '../../components/Icon';
import { Button, Skeleton } from '../../components/ui';
import { useSimulatedLoading } from '../../app/hooks';
import { BoardingCode } from './BoardingCode';
import './FaresScreen.css';

/** Sample loyalty numbers: every tenth ride is free. */
const RIDES_TAKEN = 7;
const RIDES_FOR_FREE = 10;

function OfflineBadge() {
  return (
    <span className="fares-offline">
      <Icon name="check" size={16} strokeWidth={2.5} />
      <span>Works offline</span>
    </span>
  );
}

function FreeRideProgress() {
  const loading = useSimulatedLoading('fares-progress');
  const left = RIDES_FOR_FREE - RIDES_TAKEN;
  return (
    <section className="fares-card glass-strong" aria-labelledby="fares-progress-title">
      <div className="fares-progress__head">
        <h2 id="fares-progress-title" className="fares-card__title">
          Free ride progress
        </h2>
        {!loading && (
          <span className="fares-progress__count tabular">
            {RIDES_TAKEN} of {RIDES_FOR_FREE} rides
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton lines={2} />
      ) : (
        <>
          <div
            className="fares-progress__bar"
            role="progressbar"
            aria-labelledby="fares-progress-title"
            aria-valuemin={0}
            aria-valuemax={RIDES_FOR_FREE}
            aria-valuenow={RIDES_TAKEN}
            aria-valuetext={`${RIDES_TAKEN} of ${RIDES_FOR_FREE} rides`}
          >
            {Array.from({ length: RIDES_FOR_FREE }, (_, i) => (
              <span
                key={i}
                className={`fares-progress__pip ${i < RIDES_TAKEN ? 'fares-progress__pip--on' : ''}`}
              />
            ))}
          </div>
          <p className="fares-progress__note t-small t-muted">
            {left} more {left === 1 ? 'ride' : 'rides'} to a free trip
          </p>
        </>
      )}
    </section>
  );
}

export function FaresScreen() {
  const [enlarged, setEnlarged] = useState(false);
  const [walletNote, setWalletNote] = useState(false);
  const codeId = useId();

  return (
    <Page title="Fares" action={<OfflineBadge />}>
      <div className={`fares ${enlarged ? 'fares--enlarged' : ''}`}>
        <section className="fares-pass" aria-label="Boarding pass">
          <div className="fares-pass__main">
            <div className="fares-pass__tile">
              <BoardingCode id={codeId} />
            </div>
            <p className="fares-pass__disclaimer t-caption t-muted">
              Sample code for design only. Not a valid fare code.
            </p>
            <Button
              variant="ghost"
              icon={enlarged ? 'shrink' : 'expand'}
              aria-expanded={enlarged}
              aria-controls={codeId}
              onClick={() => setEnlarged((v) => !v)}
              className="fares-pass__toggle"
            >
              {enlarged ? 'Shrink code' : 'Trouble scanning? Enlarge code'}
            </Button>
          </div>
          <div className="fares-pass__stub">
            <h2 className="t-title-sm">Hold flat against the reader</h2>
            <p className="fares-pass__bright t-small t-muted">
              Screen brightness is set to full while this is open
            </p>
            <p className="t-caption fares-pass__sim">Brightness change is simulated in this concept.</p>
          </div>
        </section>

        <div className="fares__extras">
          <div className="fares-card fares-row glass-strong">
            <span className="fares-row__icon" aria-hidden="true">
              <Icon name="faceid" size={24} />
            </span>
            <p className="t-small">Face ID opens this pass. You stay signed in on this phone.</p>
          </div>

          <FreeRideProgress />

          <div className="fares-wallet">
            <Button
              variant="secondary"
              size="lg"
              icon="wallet"
              block
              aria-describedby={walletNote ? 'fares-wallet-note' : undefined}
              onClick={() => setWalletNote(true)}
            >
              Add to Wallet
            </Button>
            <div role="status" className="fares-wallet__status">
              {walletNote && (
                <p id="fares-wallet-note" className="fares-wallet__note t-small">
                  <Icon name="info" size={18} />
                  <span>Wallet passes aren't part of this concept.</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
