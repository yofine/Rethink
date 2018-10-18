import React from 'react';
import Link from 'gatsby-link';
import moment from 'moment';
import Canvas from '../Canvas';
import './style.scss';

class Code extends React.Component {
  render() {
    const { html, htmlAst, frontmatter } = this.props.data.node
    const { slug, categorySlug } = this.props.data.node.fields;
    const code = htmlAst.children[0].children[1].children[0].children[0].value
    debugger

    return (
      <div className="post">
        <h2 className="post__title">
          <Link className="post__title-link" to={slug}>{frontmatter.title}</Link>
        </h2>
        <Canvas code={code} />
      </div>
    );
  }
}

export default Code;
