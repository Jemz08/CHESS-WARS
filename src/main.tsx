// Safeguard WebGL getProgramInfoLog and getShaderInfoLog against returning null (Three.js WebGLProgram expects string for .trim())
if (typeof window !== 'undefined') {
  if (typeof WebGLRenderingContext !== 'undefined' && WebGLRenderingContext.prototype) {
    const origProgLog = WebGLRenderingContext.prototype.getProgramInfoLog;
    WebGLRenderingContext.prototype.getProgramInfoLog = function(program) {
      const res = origProgLog.call(this, program);
      return res !== null && res !== undefined ? res : '';
    };
    const origShaderLog = WebGLRenderingContext.prototype.getShaderInfoLog;
    WebGLRenderingContext.prototype.getShaderInfoLog = function(shader) {
      const res = origShaderLog.call(this, shader);
      return res !== null && res !== undefined ? res : '';
    };
  }
  if (typeof WebGL2RenderingContext !== 'undefined' && WebGL2RenderingContext.prototype) {
    const origProgLog2 = WebGL2RenderingContext.prototype.getProgramInfoLog;
    WebGL2RenderingContext.prototype.getProgramInfoLog = function(program) {
      const res = origProgLog2.call(this, program);
      return res !== null && res !== undefined ? res : '';
    };
    const origShaderLog2 = WebGL2RenderingContext.prototype.getShaderInfoLog;
    WebGL2RenderingContext.prototype.getShaderInfoLog = function(shader) {
      const res = origShaderLog2.call(this, shader);
      return res !== null && res !== undefined ? res : '';
    };
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
