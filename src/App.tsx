/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ApiKeyGuard from './components/ApiKeyGuard';
import AudioTo3DApp from './components/AudioTo3DApp';

export default function App() {
  return (
    <ApiKeyGuard>
      <AudioTo3DApp />
    </ApiKeyGuard>
  );
}
