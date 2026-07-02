import { CSSProperties } from 'react';
import { Text, View } from '@tarojs/components';
import './index.scss';

interface MemberLevelBadgeProps {
  levelNo: number | string;
  levelName: string;
  themeColor?: string;
  className?: string;
}

const DEFAULT_MEMBER_LEVEL_COLOR = '#ffc23a';

// 统一会员等级胶囊样式，页面仍负责传入当前已有的等级编号和名称。
export function MemberLevelBadge({
  levelNo,
  levelName,
  themeColor = DEFAULT_MEMBER_LEVEL_COLOR,
  className,
}: MemberLevelBadgeProps) {
  return (
    <View
      className={['member-level-badge', className].filter(Boolean).join(' ')}
      style={{ '--member-level-badge-color': themeColor } as CSSProperties}
    >
      <View className="member-level-badge__no">
        <Text>{levelNo}</Text>
      </View>
      <View className="member-level-badge__name">
        <Text>{levelName}</Text>
      </View>
    </View>
  );
}
