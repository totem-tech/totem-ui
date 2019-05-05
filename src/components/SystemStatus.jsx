import React from 'react';
import PropTypes from 'prop-types';
import { Header, List } from 'semantic-ui-react';

const SystemStatus = props => {
  return (
    <React.Fragment>
      <Header as="h2">System Status</Header>
      <List>
        {props.items.map((item, i) => (
          <List.Item
            key={i}
            className={item.title === undefined ? 'empty' : ''}
          >
            {item.icon && <List.Icon name={item.icon} color={item.iconColor} />}
            <List.Content>{item.title || <br />}</List.Content>
          </List.Item>
        ))}
      </List>
    </React.Fragment>
  );
};

SystemStatus.propTypes = {
  items: PropTypes.array
};

SystemStatus.defaultProps = {
  items: []
};

export default SystemStatus;
