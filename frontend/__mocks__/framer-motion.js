const React = require('react');

module.exports = {
  ...jest.requireActual('framer-motion'),
  motion: new Proxy(
    {},
    {
      get: (_, tag) => {
        return React.forwardRef(function MotionComponent(props, ref) {
          const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props;
          return React.createElement(tag, { ...rest, ref });
        });
      },
    },
  ),
  AnimatePresence: ({ children }) => children,
};
