// TODO: support commented props
import React, {PureComponent} from 'react';
import {
  StyleSheet,
  /* processColor, */ TextStyle,
  LayoutRectangle,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle
} from 'react-native';
import _ from 'lodash';
import Reanimated from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import {State} from 'react-native-gesture-handler';
import {interpolateColor} from 'react-native-redash';
import {Colors, Typography, Spacings} from '../../style';
import Badge, {BadgeProps, BADGE_SIZES} from '../../components/badge';
import {TouchableOpacity, TouchableOpacityProps} from '../../incubator';

const {cond, eq, call, block, event, and} = Reanimated;

const DEFAULT_LABEL_COLOR = Colors.black;
const DEFAULT_SELECTED_LABEL_COLOR = Colors.blue30;

export interface TabBarItemProps {
  /**
   * label of the tab
   */
  label?: string;
  /**
   * custom label style
   */
  labelStyle?: TextStyle;
  /**
   * custom selected label style
   */
  selectedLabelStyle?: TextStyle;
  /**
   * the default label color
   */
  labelColor?: string;
  /**
   * the selected label color
   */
  selectedLabelColor?: string;
  /**
   * icon of the tab
   */
  icon?: number;
  /**
   * icon tint color
   */
  iconColor?: string;
  /**
   * icon selected tint color
   */
  selectedIconColor?: string;
  /**
   * Badge component props to display next the item label
   */
  badge?: BadgeProps;
  // /**
  //  * maximun number of lines the label can break
  //  */
  // maxLines?: number;
  // /**
  //  * whether the tab will have a divider on its right
  //  */
  // showDivider?: boolean;
  /**
   * A fixed width for the item
   */
  width?: number;
  /**
   * ignore of the tab
   */
  ignore?: boolean;
  /**
   * callback for when pressing a tab
   */
  onPress?: (index: number) => void;
  /**
   * whether to change the text to uppercase
   */
  uppercase?: boolean;
  /**
   * The active opacity when pressing a tab
   */
  activeOpacity?: number;
  /**
   * TODO: rename to feedbackColor
   * Apply background color on press for TouchableOpacity
   */
  activeBackgroundColor?: string;
  /**
   * Pass custom style
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Used as a testing identifier
   */
  testID?: string;
}

interface Props extends TabBarItemProps {
  index: number;
  targetPage: any; // TODO: typescript?
  state: State;
  currentPage: Animated.Adaptable<number>;
  onLayout: (layout: Partial<LayoutRectangle>, index: number) => void;
}

/**
 * @description: TabController's TabBarItem
 * @example: https://github.com/wix/react-native-ui-lib/blob/master/demo/src/screens/componentScreens/TabControllerScreen/index.js
 * @notes: Must be rendered as a direct child of TabController.TabBar.
 */
export default class TabBarItem extends PureComponent<Props> {
  static displayName = 'TabController.TabBarItem';

  static defaultProps = {
    activeOpacity: 1,
    onPress: _.noop
  };

  private itemWidth?: number;
  private itemRef = React.createRef<any>();

  constructor(props: Props) {
    super(props);

    this.itemWidth = this.props.width;

    if (this.itemWidth) {
      const {index, onLayout} = this.props;
      onLayout({width: this.itemWidth}, index);
    }
  }

  onStateChange = event(
    [
      {
        nativeEvent: {state: this.props.state}
      }
    ],
    {useNativeDriver: true}
  );

  onLayout = ({
    nativeEvent: {
      layout: {width}
    }
  }: LayoutChangeEvent) => {
    const {index, onLayout} = this.props;
    if (!this.itemWidth && this.itemRef && this.itemRef.current) {
      this.itemWidth = width;
      // @ts-ignore
      this.itemRef.current.setNativeProps({style: {width, paddingHorizontal: null, flex: null}});
      if (onLayout) {
        onLayout({width}, index);
      }
    }
  };

  onPress = () => {
    const {index, onPress} = this.props;
    onPress?.(index);
  };

  getItemStyle(): TouchableOpacityProps['style'] {
    const {state, style: propsStyle, activeOpacity = TabBarItem.defaultProps.activeOpacity} = this.props;
    const opacity = block([
      cond(eq(state, State.END), call([], this.onPress)),
      cond(eq(state, State.BEGAN), activeOpacity, 1)
    ]);

    const style: TouchableOpacityProps['style'] = {
      opacity
    };

    if (this.props.width) {
      style.flex = undefined;
      style.width = this.itemWidth;
      style.paddingHorizontal = undefined;
    }

    return [style, propsStyle];
  }

  getLabelStyle() {
    const {
      index,
      currentPage,
      targetPage,
      labelColor,
      selectedLabelColor,
      ignore,
      labelStyle,
      selectedLabelStyle
    } = this.props;

    let fontWeight, letterSpacing, fontFamily;

    if (labelStyle?.fontWeight || selectedLabelStyle?.fontWeight) {
      fontWeight = cond(
        // @ts-ignore TODO: typescript - add or delete and?
        and(eq(targetPage, index) /* , defined(itemWidth) */),
        selectedLabelStyle?.fontWeight || 'normal',
        labelStyle?.fontWeight || 'normal'
      );
    }

    if (labelStyle?.letterSpacing || selectedLabelStyle?.letterSpacing) {
      letterSpacing = cond(
        // @ts-ignore TODO: typescript - add or delete and?
        and(eq(targetPage, index) /* , defined(itemWidth) */),
        selectedLabelStyle?.letterSpacing || 0,
        labelStyle?.letterSpacing || 0
      );
    }

    if (labelStyle?.fontFamily || selectedLabelStyle?.fontFamily) {
      fontFamily = cond(
        // @ts-ignore TODO: typescript - add or delete and?
        and(eq(targetPage, index) /* , defined(itemWidth) */),
        // @ts-ignore
        selectedLabelStyle.fontFamily,
        labelStyle?.fontFamily
      );
    }

    const inactiveColor = labelColor || DEFAULT_LABEL_COLOR;
    const activeColor = !ignore ? selectedLabelColor || DEFAULT_SELECTED_LABEL_COLOR : inactiveColor;

    // Animated color
    const color = interpolateColor(currentPage, {
      inputRange: [index - 1, index, index + 1],
      outputRange: [inactiveColor, activeColor, inactiveColor]
    });

    return [
      labelStyle,
      _.omitBy(
        {
          fontFamily,
          fontWeight,
          letterSpacing,
          color
        },
        _.isUndefined
      )
    ];
  }

  getIconStyle() {
    const {index, currentPage, iconColor, selectedIconColor, labelColor, selectedLabelColor, ignore} = this.props;

    const activeColor = selectedIconColor || selectedLabelColor || DEFAULT_SELECTED_LABEL_COLOR;
    const inactiveColor = iconColor || labelColor || DEFAULT_LABEL_COLOR;

    const tintColor = cond(
      eq(currentPage, index),
      // TODO: using processColor here broke functionality,
      // not using it seem to not be very performant
      activeColor,
      ignore ? activeColor : inactiveColor
    );

    return {
      tintColor
    };
  }

  render() {
    const {label, icon, badge, state, uppercase, activeOpacity, activeBackgroundColor, testID} = this.props;

    return (
      <TouchableOpacity
        ref={this.itemRef}
        pressState={state}
        style={[styles.tabItem, this.getItemStyle()]}
        onLayout={this.onLayout}
        feedbackColor={activeBackgroundColor}
        activeOpacity={activeOpacity}
        onPress={this.onPress}
        testID={testID}
      >
        {icon && (
          <Reanimated.Image
            source={icon}
            style={[!_.isUndefined(label) && styles.tabItemIconWithLabel, this.getIconStyle()]}
          />
        )}
        {!_.isEmpty(label) && (
          <Reanimated.Text style={[styles.tabItemLabel, this.getLabelStyle()]}>
            {uppercase ? _.toUpper(label) : label}
          </Reanimated.Text>
        )}
        {badge && (
          // @ts-ignore
          <Badge backgroundColor={Colors.red30} size={BADGE_SIZES.default} {...badge} containerStyle={styles.badge} />
        )}
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacings.s4
  },
  tabItemLabel: {
    ...Typography.text80
  },
  tabItemIconWithLabel: {
    marginRight: 10
  },
  badge: {
    marginLeft: Spacings.s1
  }
});
