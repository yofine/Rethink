import React from 'react';
import Helmet from 'react-helmet';
import Post from '../components/Post';
import Code from '../components/Code';
import Sidebar from '../components/Sidebar';

class WebGL extends React.Component {
  render() {
    const items = [];
    const { title, subtitle } = this.props.data.site.siteMetadata;
    const codes = this.props.data.allMarkdownRemark.edges;
    codes.forEach((code) => {
      items.push(<Code data={code} key={code.node.frontmatter.title} />);
    });

    return (
      <div>
        <Helmet>
          <title>{title}</title>
          <meta name="description" content={subtitle} />
        </Helmet>
        <Sidebar {...this.props} />
        <div className="content">
          <div className="content__inner">
            {items}
          </div>
        </div>
      </div>
    );
  }
}

export default WebGL;

export const pageQuery = graphql`
  query WebGLQuery {
    site {
      siteMetadata {
        title
        subtitle
        copyright
        menu {
          label
          path
        }
        author {
          name
          email
          telegram
          twitter
          github
          rss
          vk
        }
      }
    }
    allMarkdownRemark(
        limit: 1000,
        filter: { frontmatter: { layout: { eq: "code" }, draft: { ne: true } } },
        sort: { order: DESC, fields: [frontmatter___date] }
      ){
      edges {
        node {
          fields {
            slug
            categorySlug
          }
          html
          htmlAst
          frontmatter {
            title
            date
            category
            description
          }
        }
      }
    }
  }
`;
