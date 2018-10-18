import React from 'react';
import './style.scss';

class Canvas extends React.Component {
  
  componentDidMount() {
    const code = this.props.code
    const renderFunc = new Function('canvas', code)
    debugger
    renderFunc(this.canvas)
  }

  render() {
    return (
      <canvas width="630" height="200" ref={dom => this.canvas = dom} />
    );
  }
}

export default Canvas;
