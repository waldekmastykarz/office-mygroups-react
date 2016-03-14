var React = require('react');

var Loading = React.createClass({
  render: function() {
    return (
      <div className="spinner">
        <img src={'images/ajax-loader.gif'} /> <span className="ms-font-s-plus">Loading...</span>
      </div>
    );
  }
});

module.exports = Loading;