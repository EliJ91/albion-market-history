import { useCallback, useEffect, useRef, useState } from 'react';
import { QUALITY_LABELS } from '../config';
import { getRerollAnalysis } from '../utils/reroll';

const silver = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const VIEWPORT_MARGIN = 16;
const DROPDOWN_GAP = 8;
const DROPDOWN_MAX_WIDTH = 780;

function formatSilver(value) {
  return value == null ? 'No data' : silver.format(value);
}

function formatChance(value) {
  return `${Math.round(Math.min(1, value) * 1000) / 10}%`;
}

function formatNet(value) {
  if (value == null) return 'No price data';
  return `${value > 0 ? '+' : ''}${formatSilver(value)}`;
}

export function getDropdownPosition({
  dropdownHeight,
  triggerRect,
  viewportHeight,
  viewportWidth,
}) {
  const width = Math.min(DROPDOWN_MAX_WIDTH, viewportWidth - VIEWPORT_MARGIN * 2);
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, triggerRect.right - width),
    viewportWidth - width - VIEWPORT_MARGIN,
  );
  const availableBelow = viewportHeight - triggerRect.bottom - DROPDOWN_GAP - VIEWPORT_MARGIN;
  const availableAbove = triggerRect.top - DROPDOWN_GAP - VIEWPORT_MARGIN;
  const placeAbove = availableBelow < Math.min(dropdownHeight, 320) && availableAbove > availableBelow;
  const maxHeight = Math.max(0, placeAbove ? availableAbove : availableBelow);
  const top = placeAbove
    ? Math.max(VIEWPORT_MARGIN, triggerRect.top - Math.min(dropdownHeight, maxHeight) - DROPDOWN_GAP)
    : triggerRect.bottom + DROPDOWN_GAP;

  return {
    left,
    maxHeight,
    top,
    width,
  };
}

export default function RerollMenu({
  currentQuality,
  itemValue,
  qualityAverages,
}) {
  const detailsRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const analysis = getRerollAnalysis({
    itemValue,
    qualityAverages,
  });
  const plans = [...analysis.plans].sort((left, right) => {
    const leftCurrent = left.sourceQuality === Number(currentQuality);
    const rightCurrent = right.sourceQuality === Number(currentQuality);
    if (leftCurrent !== rightCurrent) return leftCurrent ? -1 : 1;
    return left.sourceQuality - right.sourceQuality || left.targetQuality - right.targetQuality;
  });

  const positionDropdown = useCallback(() => {
    if (!detailsRef.current?.open || !dropdownRef.current) return;

    const triggerRect = detailsRef.current.querySelector('summary').getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    setDropdownStyle(getDropdownPosition({
      dropdownHeight: dropdownRect.height,
      triggerRect,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    }));
  }, []);

  useEffect(() => {
    function dismissDropdown(event) {
      if (!detailsRef.current?.open) return;
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && detailsRef.current.contains(event.target)) return;
      detailsRef.current.open = false;
    }

    window.addEventListener('resize', positionDropdown);
    window.addEventListener('scroll', positionDropdown, true);
    document.addEventListener('keydown', dismissDropdown);
    document.addEventListener('pointerdown', dismissDropdown);
    return () => {
      window.removeEventListener('resize', positionDropdown);
      window.removeEventListener('scroll', positionDropdown, true);
      document.removeEventListener('keydown', dismissDropdown);
      document.removeEventListener('pointerdown', dismissDropdown);
    };
  }, [positionDropdown]);

  function handleToggle(event) {
    if (event.currentTarget.open) requestAnimationFrame(positionDropdown);
  }

  return (
    <details className="reroll-menu" onToggle={handleToggle} ref={detailsRef}>
      <summary>Reroll?</summary>
      <div className="reroll-dropdown" ref={dropdownRef} style={dropdownStyle}>
        <div className="reroll-heading">
          <div>
            <strong>Reroll until target quality</strong>
            <span>Expected results using repeat attempts and quality upgrades.</span>
          </div>
          <span className="reroll-item-value">Item Value <strong>{formatSilver(itemValue)}</strong></span>
        </div>

        {!itemValue && <p className="reroll-message">Item Value is unavailable for this item.</p>}
        {itemValue && (
          <div className="reroll-table" role="table" aria-label="Reroll quality comparison">
            <div className="reroll-table-header" role="row">
              <span role="columnheader">Plan</span>
              <span role="columnheader">First roll</span>
              <span role="columnheader">Avg rolls</span>
              <span role="columnheader">Avg cost</span>
              <span role="columnheader">Verdict / net</span>
            </div>
            {plans.map((plan, index) => {
              const startsNewGroup = index === 0 || plans[index - 1].sourceQuality !== plan.sourceQuality;
              return (
              <div
                className={[
                  'reroll-table-row',
                  plan.sourceQuality % 2 === 1 ? 'source-group-tinted' : 'source-group-plain',
                  startsNewGroup ? 'source-group-start' : '',
                  plan.sourceQuality === Number(currentQuality) ? 'current-quality' : '',
                ].filter(Boolean).join(' ')}
                key={`${plan.sourceQuality}:${plan.targetQuality}`}
                role="row"
              >
                <span className="reroll-plan" role="cell">
                  {QUALITY_LABELS[plan.sourceQuality]}
                  <span aria-hidden="true">to</span>
                  {QUALITY_LABELS[plan.targetQuality]}
                </span>
                <span role="cell">{formatChance(plan.firstRollChance)}</span>
                <span role="cell">{formatSilver(plan.expectedRolls)}</span>
                <span role="cell">{formatSilver(plan.expectedCost)}</span>
                <span
                  className={plan.worthIt === true ? 'positive' : plan.worthIt === false ? 'negative' : ''}
                  role="cell"
                  title={plan.expectedNet == null
                    ? 'The enabled cities need price data for both qualities.'
                    : `Expected price gain ${formatSilver(plan.priceGain)} minus expected reroll cost ${formatSilver(plan.expectedCost)}.`}
                >
                  {plan.worthIt === true
                    ? plan.usesTargetPriceEstimate ? 'Worth it (estimate)' : 'Worth it'
                    : plan.worthIt === false
                      ? plan.usesTargetPriceEstimate ? 'Not worth it (estimate)' : 'Not worth it'
                      : 'Unknown'}
                  <small>{formatNet(plan.expectedNet)}</small>
                </span>
              </div>
              );
            })}
          </div>
        )}
        <p className="reroll-footnote">
          "First roll" is the chance to immediately reach the target or better. Expected cost includes failures and changing costs after intermediate upgrades. Higher-quality outcomes use their own average prices when available; estimated verdicts use the target price when a rare higher quality has no data. Prices use only enabled cities and the selected date range.
        </p>
      </div>
    </details>
  );
}
