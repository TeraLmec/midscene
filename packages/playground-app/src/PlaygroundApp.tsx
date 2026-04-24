import {
  type DeviceType,
  Logo,
  NavActions,
  type PlaygroundBranding,
  type UniversalPlaygroundConfig,
} from '@midscene/visualizer';
import { Button, Layout } from 'antd';
import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { PlaygroundPreview } from './PlaygroundPreview';
import { PlaygroundThemeProvider } from './PlaygroundThemeProvider';
import { usePlaygroundController } from './controller/usePlaygroundController';
import ServerOfflineBackground from './icons/server-offline-background.svg';
import ServerOfflineForeground from './icons/server-offline-foreground.svg';
import { PlaygroundConversationPanel } from './panels/PlaygroundConversationPanel';
import './PlaygroundApp.less';

const { Content } = Layout;

export interface PlaygroundAppProps {
  serverUrl: string;
  appVersion: string;
  title?: string;
  defaultDeviceType?: DeviceType;
  branding?: Partial<PlaygroundBranding>;
  playgroundConfig?: Partial<UniversalPlaygroundConfig>;
  offlineTitle?: string;
  offlineStatusText?: string;
  pollIntervalMs?: number;
}

export function PlaygroundApp({
  serverUrl,
  appVersion,
  title = 'Playground',
  defaultDeviceType = 'web',
  branding,
  playgroundConfig,
  offlineTitle = 'Midscene Playground',
  offlineStatusText = 'Server offline...',
  pollIntervalMs = 5000,
}: PlaygroundAppProps) {
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const controller = usePlaygroundController({
    serverUrl,
    defaultDeviceType,
    countdownSeconds: playgroundConfig?.executionUx?.countdownSeconds,
    pollIntervalMs,
  });

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth <= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!controller.state.serverOnline) {
    return (
      <PlaygroundThemeProvider>
        <div className="server-offline-container">
          <div className="server-offline-message">
            <Logo />
            <div className="server-offline-content">
              <div className="server-offline-icon">
                <ServerOfflineBackground className="icon-background" />
                <ServerOfflineForeground className="icon-foreground" />
              </div>
              <h1>{offlineTitle}</h1>
              <p className="connection-status">{offlineStatusText}</p>
              <div className="offline-diagnostics">
                <div>
                  Server URL: <code>{serverUrl || window.location.origin}</code>
                </div>
                <div>
                  Launch command: <code>pnpm run playground:web</code>
                </div>
                <div>
                  Check the root <code>.env</code> for model API configuration
                  and verify the server port is not already in use.
                </div>
                <Button onClick={controller.actions.refreshServerState}>
                  Retry connection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PlaygroundThemeProvider>
    );
  }

  return (
    <PlaygroundThemeProvider>
      <Layout className="app-container playground-container">
        <Content className="app-content">
          <PanelGroup
            autoSaveId="playground-layout"
            direction={isNarrowScreen ? 'vertical' : 'horizontal'}
          >
            <Panel
              defaultSize={isNarrowScreen ? 67 : 32}
              maxSize={isNarrowScreen ? 85 : 60}
              minSize={isNarrowScreen ? 67 : 25}
              className="app-panel left-panel"
            >
              <div className="panel-content left-panel-content">
                <div className="playground-panel-header">
                  <div className="header-row">
                    <Logo />
                    <NavActions
                      showTooltipWhenEmpty={false}
                      showModelName={false}
                      playgroundSDK={controller.state.playgroundSDK}
                    />
                  </div>
                  <div className="runtime-strip">
                    <span>
                      Server:{' '}
                      {controller.state.serverOnline ? 'online' : 'offline'}
                    </span>
                    <span>
                      Target:{' '}
                      {controller.state.sessionViewState.displayName ||
                        controller.state.runtimeInfo?.title ||
                        controller.state.deviceType}
                    </span>
                    <span>
                      Preview:{' '}
                      {controller.state.runtimeInfo?.preview?.kind ||
                        'unavailable'}
                    </span>
                    <span>
                      Interface:{' '}
                      {controller.state.runtimeInfo?.interface?.type ||
                        'unknown'}
                    </span>
                  </div>
                </div>

                <div className="playground-panel-playground">
                  <PlaygroundConversationPanel
                    controller={controller}
                    appVersion={appVersion}
                    branding={branding}
                    playgroundConfig={playgroundConfig}
                    title={title}
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="panel-resize-handle" />

            <Panel
              defaultSize={isNarrowScreen ? 33 : 68}
              minSize={isNarrowScreen ? 15 : 40}
              className="app-panel right-panel"
            >
              <div className="panel-content right-panel-content">
                <PlaygroundPreview
                  playgroundSDK={controller.state.playgroundSDK}
                  runtimeInfo={controller.state.runtimeInfo}
                  serverUrl={serverUrl}
                  serverOnline={controller.state.serverOnline}
                  isUserOperating={controller.state.isUserOperating}
                />
              </div>
            </Panel>
          </PanelGroup>
        </Content>
      </Layout>
    </PlaygroundThemeProvider>
  );
}
