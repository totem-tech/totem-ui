import React from "react";
import Svg, { G, Text, TSpan } from "react-native-svg";

const TestReactComponent = props => (
  <Svg width={73} height={37} {...props}>
    <G fill="none" fillRule="evenodd" fontFamily="Helvetica">
      <Text
        fontSize={14}
        letterSpacing={-0.15}
        fill="#BEBEBE"
        transform="translate(-1 -3)"
      >
        <TSpan x={0.609} y={37.188}>
          {`Reserves`}
        </TSpan>
      </Text>
      <Text
        fontSize={17}
        letterSpacing={-0.41}
        fill="#D0021B"
        transform="translate(-1 -3)"
      >
        <TSpan x={1.609} y={16.863}>
          {`$ 1007.00`}
        </TSpan>
      </Text>
    </G>
  </Svg>
);

export default TestReactComponent;