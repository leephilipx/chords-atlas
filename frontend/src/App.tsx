import { ConfigProvider, App as AntApp, theme } from 'antd'
import ChordBrowser from './components/ChordBrowser'

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#1677ff' },
      }}
    >
      <AntApp>
        <ChordBrowser />
      </AntApp>
    </ConfigProvider>
  )
}

export default App
