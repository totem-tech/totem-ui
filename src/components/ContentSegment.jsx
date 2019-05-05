import React from 'react';
import { Icon, Header, Image, Segment } from 'semantic-ui-react';
const placeholderImage =
  'https://react.semantic-ui.com/images/wireframe/paragraph.png';

const ContentSegment = props => {
  const headerText = props.header || props.title;
  const header = (
    <Header as="h1" inverted>
      <Icon name={props.icon} />
      <Header.Content>
        <div>{headerText}</div>
        {!!props.subHeader && <Header.Subheader>{props.subHeader}</Header.Subheader>}
      </Header.Content>
    </Header>
  );
  return !props.active ? '' : (
    <Segment style={style} padded>
      {headerText && header }
      <div style={{ paddingBottom: '1em' }}>
        {props.content || <Image src={placeholderImage} />}
      </div>
    </Segment>
  );
};

export default ContentSegment;

const style = {
  color: 'white',
  background: 'none',
  borderColor: 'white',
  borderWidth: 5,
  borderRadius: 7,
  margin: '1em'
};
