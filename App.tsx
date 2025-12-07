import React, { useState } from 'react';
import Experience from './components/Experience';
import Overlay from './components/Overlay';
import { TreeState } from './types';

function App() {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.SCATTERED);

  return (
    <div className="w-full h-full relative bg-black">
      <Experience treeState={treeState} />
      <Overlay treeState={treeState} setTreeState={setTreeState} />
    </div>
  );
}

export default App;
