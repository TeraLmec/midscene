import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  InfoCircleOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Input, Spin, Switch, Tooltip, message } from 'antd';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { mapPreviewPointToImagePoint } from '../../utils/preview-coordinate';
import './index.less';

interface ScreenshotViewerProps {
  getScreenshot: () => Promise<{
    screenshot: string;
    timestamp: number;
  } | null>;
  getInterfaceInfo?: () => Promise<{
    type: string;
    description?: string;
  } | null>;
  serverOnline: boolean;
  isUserOperating?: boolean; // Whether user is currently operating
  mjpegUrl?: string; // When provided, use MJPEG live stream instead of polling
  interactiveAvailable?: boolean;
  onPreviewClick?: (payload: {
    x: number;
    y: number;
    clickCount?: number;
  }) => Promise<void>;
  onPreviewType?: (payload: { text: string }) => Promise<void>;
  onPreviewKey?: (payload: { key: string }) => Promise<void>;
  onPreviewScroll?: (payload: {
    deltaX?: number;
    deltaY?: number;
  }) => Promise<void>;
  onPreviewNavigation?: (payload: {
    action: 'reload' | 'back' | 'forward';
  }) => Promise<void>;
}

export default function ScreenshotViewer({
  getScreenshot,
  getInterfaceInfo,
  serverOnline,
  isUserOperating = false,
  mjpegUrl,
  interactiveAvailable = false,
  onPreviewClick,
  onPreviewType,
  onPreviewKey,
  onPreviewScroll,
  onPreviewNavigation,
}: ScreenshotViewerProps) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [interfaceInfo, setInterfaceInfo] = useState<{
    type: string;
    description?: string;
  } | null>(null);
  const [interactive, setInteractive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fitMode, setFitMode] = useState<'fit' | 'actual'>('fit');
  const [typedText, setTypedText] = useState('');
  const isMjpeg = Boolean(mjpegUrl && serverOnline);

  // Refs for managing polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingPausedRef = useRef(false);

  // Core function to fetch screenshot
  const fetchScreenshot = useCallback(
    async (isManual = false) => {
      if (!serverOnline) return;

      setLoading(true);
      if (isManual) setError(null); // Clear errors on manual refresh

      try {
        const result = await getScreenshot();
        console.log('Screenshot API response:', result); // Debug log

        if (result?.screenshot) {
          // Ensure screenshot is a valid string
          const screenshotData = result.screenshot.toString().trim();
          if (screenshotData) {
            // Screenshot data is already in full data URL format from createImgBase64ByFormat
            setScreenshot(screenshotData);
            setError(null); // Clear any previous errors
            setLastUpdateTime(Date.now());
          } else {
            setError('Empty screenshot data received');
          }
        } else {
          setError('No screenshot data in response');
        }
      } catch (err) {
        console.error('Screenshot fetch error:', err); // Debug log
        setError(
          err instanceof Error ? err.message : 'Failed to fetch screenshot',
        );
      } finally {
        setLoading(false);
      }
    },
    [getScreenshot, serverOnline],
  );

  // Function to fetch interface info
  const fetchInterfaceInfo = useCallback(async () => {
    if (!serverOnline || !getInterfaceInfo) return;

    try {
      const info = await getInterfaceInfo();
      if (info) {
        setInterfaceInfo(info);
      }
    } catch (err) {
      console.error('Interface info fetch error:', err);
    }
  }, [getInterfaceInfo, serverOnline]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    console.log('Starting screenshot polling (5s interval)');
    pollingIntervalRef.current = setInterval(() => {
      if (!isPollingPausedRef.current && serverOnline) {
        if (!paused) {
          fetchScreenshot(false);
        }
      }
    }, 5000); // 5 second polling
  }, [fetchScreenshot, paused, serverOnline]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('Stopping screenshot polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Pause polling (don't clear interval, just mark as paused)
  const pausePolling = useCallback(() => {
    console.log('Pausing screenshot polling');
    isPollingPausedRef.current = true;
  }, []);

  // Resume polling
  const resumePolling = useCallback(() => {
    console.log('Resuming screenshot polling');
    isPollingPausedRef.current = false;
  }, []);

  const handleManualRefresh = useCallback(() => {
    fetchScreenshot(true);
  }, [fetchScreenshot]);

  const sendPreviewInput = useCallback(
    async (operation: () => Promise<void>) => {
      try {
        await operation();
        if (!isMjpeg) {
          await fetchScreenshot(false);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Preview input failed';
        message.error(errorMessage);
      }
    },
    [fetchScreenshot, isMjpeg],
  );

  const handleImageClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      if (!interactive || !onPreviewClick) return;
      if (event.detail !== 1) return;
      const image = event.currentTarget;
      const point = mapPreviewPointToImagePoint({
        clientX: event.clientX,
        clientY: event.clientY,
        imageRect: image.getBoundingClientRect(),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      if (!point) return;
      sendPreviewInput(() =>
        onPreviewClick({
          ...point,
          clickCount: 1,
        }),
      );
    },
    [interactive, onPreviewClick, sendPreviewInput],
  );

  const handleImageDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      if (!interactive || !onPreviewClick) return;
      const image = event.currentTarget;
      const point = mapPreviewPointToImagePoint({
        clientX: event.clientX,
        clientY: event.clientY,
        imageRect: image.getBoundingClientRect(),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      if (!point) return;
      sendPreviewInput(() =>
        onPreviewClick({
          ...point,
          clickCount: 2,
        }),
      );
    },
    [interactive, onPreviewClick, sendPreviewInput],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLImageElement>) => {
      if (!interactive || !onPreviewScroll) return;
      event.preventDefault();
      sendPreviewInput(() =>
        onPreviewScroll({
          deltaX: event.deltaX,
          deltaY: event.deltaY,
        }),
      );
    },
    [interactive, onPreviewScroll, sendPreviewInput],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!interactive || !onPreviewKey) return;
      const tagName = (event.target as HTMLElement).tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;
      const allowedKeys = new Set([
        'Enter',
        'Escape',
        'Tab',
        'Backspace',
        'Delete',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ]);
      if (!allowedKeys.has(event.key)) return;
      event.preventDefault();
      sendPreviewInput(() => onPreviewKey({ key: event.key }));
    },
    [interactive, onPreviewKey, sendPreviewInput],
  );

  const handleTypeSubmit = useCallback(() => {
    if (!typedText || !onPreviewType) return;
    const text = typedText;
    setTypedText('');
    sendPreviewInput(() => onPreviewType({ text }));
  }, [onPreviewType, sendPreviewInput, typedText]);

  const handleNavigation = useCallback(
    (action: 'reload' | 'back' | 'forward') => {
      if (!onPreviewNavigation) return;
      sendPreviewInput(() => onPreviewNavigation({ action }));
    },
    [onPreviewNavigation, sendPreviewInput],
  );

  // Manage server connection status changes
  useEffect(() => {
    if (!serverOnline) {
      setScreenshot(null);
      setError(null);
      setInterfaceInfo(null);
      stopPolling();
      return;
    }

    // Fetch interface info regardless of mode
    fetchInterfaceInfo();

    // In MJPEG mode, skip polling entirely
    if (isMjpeg || paused) {
      stopPolling();
      return;
    }

    // When server comes online, fetch screenshot and interface info immediately, then start polling
    fetchScreenshot(false);
    startPolling();

    return () => {
      stopPolling();
    };
  }, [
    serverOnline,
    isMjpeg,
    paused,
    startPolling,
    stopPolling,
    fetchScreenshot,
    fetchInterfaceInfo,
  ]);

  // Manage user operation status changes
  useEffect(() => {
    if (!serverOnline) return;

    if (isUserOperating) {
      // When user starts operating, pause polling
      pausePolling();
    } else {
      // When user operation ends, update screenshot immediately and resume polling
      resumePolling();
      if (!paused) {
        fetchScreenshot(false);
      }
    }
  }, [
    isUserOperating,
    pausePolling,
    resumePolling,
    fetchScreenshot,
    paused,
    serverOnline,
  ]);

  // Cleanup function
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  if (!serverOnline) {
    return (
      <div className="screenshot-viewer offline">
        <div className="screenshot-placeholder">
          <h3>📱 Screen Preview</h3>
          <p>Start the playground server to see real-time screenshots</p>
        </div>
      </div>
    );
  }

  if (!isMjpeg && loading && !screenshot) {
    return (
      <div className="screenshot-viewer loading">
        <Spin size="large" />
        <p>Loading screenshot...</p>
      </div>
    );
  }

  if (!isMjpeg && error && !screenshot) {
    return (
      <div className="screenshot-viewer error">
        <div className="screenshot-placeholder">
          <h3>📱 Screen Preview</h3>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const formatLastUpdateTime = (timestamp: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div
      className="screenshot-viewer"
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="screenshot-header">
        <div className="screenshot-title">
          <h3>{interfaceInfo?.type ? interfaceInfo.type : 'Device Name'}</h3>
        </div>
      </div>
      <div className="screenshot-container">
        <div className="screenshot-overlay">
          <div className="device-name-overlay">
            Device Name
            <Tooltip title={interfaceInfo?.description}>
              <InfoCircleOutlined size={16} className="info-icon" />
            </Tooltip>
          </div>
          <div className="screenshot-controls">
            {lastUpdateTime > 0 && (
              <span className="last-update-time">
                Last updated {formatLastUpdateTime(lastUpdateTime)}
              </span>
            )}
            {interactiveAvailable && (
              <Tooltip title="Forward browser input from this preview">
                <span className="interactive-toggle">
                  Interactive
                  <Switch
                    size="small"
                    checked={interactive}
                    onChange={setInteractive}
                    aria-label="Toggle interactive preview input"
                  />
                </span>
              </Tooltip>
            )}
            <Tooltip title={paused ? 'Resume preview' : 'Pause preview'}>
              <Button
                aria-label={paused ? 'Resume preview' : 'Pause preview'}
                icon={paused ? <PlayCircleOutlined /> : <PauseOutlined />}
                onClick={() => setPaused((value) => !value)}
                size="small"
              />
            </Tooltip>
            {onPreviewNavigation && (
              <>
                <Tooltip title="Go back">
                  <Button
                    aria-label="Go back"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => handleNavigation('back')}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="Go forward">
                  <Button
                    aria-label="Go forward"
                    icon={<ArrowRightOutlined />}
                    onClick={() => handleNavigation('forward')}
                    size="small"
                  />
                </Tooltip>
              </>
            )}
            <Tooltip title="Refresh screenshot">
              <Button
                aria-label="Refresh screenshot"
                icon={<ReloadOutlined />}
                onClick={() =>
                  onPreviewNavigation
                    ? handleNavigation('reload')
                    : handleManualRefresh()
                }
                loading={loading}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Toggle screenshot fit mode">
              <Button
                aria-label="Toggle screenshot fit mode"
                size="small"
                onClick={() =>
                  setFitMode((mode) => (mode === 'fit' ? 'actual' : 'fit'))
                }
              >
                {fitMode === 'fit' ? '1:1' : 'Fit'}
              </Button>
            </Tooltip>
            {isUserOperating && (
              <span className="operation-indicator">
                <Spin size="small" /> Operating...
              </span>
            )}
          </div>
        </div>
        {interactive && onPreviewType ? (
          <div className="screenshot-typebar">
            <Input
              aria-label="Type into preview"
              size="small"
              value={typedText}
              onChange={(event) => setTypedText(event.target.value)}
              onPressEnter={handleTypeSubmit}
              placeholder="Type text and press Enter"
            />
            <Button size="small" onClick={handleTypeSubmit}>
              Send
            </Button>
          </div>
        ) : null}
        <div className="screenshot-content">
          {isMjpeg ? (
            <img
              src={mjpegUrl}
              alt="Device Live Stream"
              className={`screenshot-image ${fitMode === 'actual' ? 'actual-size' : ''}`}
              onClick={handleImageClick}
              onDoubleClick={handleImageDoubleClick}
              onWheel={handleWheel}
            />
          ) : screenshot ? (
            <img
              src={
                screenshot.startsWith('data:image/')
                  ? screenshot
                  : `data:image/png;base64,${screenshot}`
              }
              alt="Device Screenshot"
              className={`screenshot-image ${fitMode === 'actual' ? 'actual-size' : ''}`}
              onClick={handleImageClick}
              onDoubleClick={handleImageDoubleClick}
              onWheel={handleWheel}
              onLoad={() => console.log('Screenshot image loaded successfully')}
              onError={(e) => {
                console.error('Screenshot image load error:', e);
                console.error(
                  'Screenshot data preview:',
                  screenshot.substring(0, 100),
                );
                setError('Failed to load screenshot image');
              }}
            />
          ) : (
            <div className="screenshot-placeholder">
              <p>No screenshot available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
