import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { QuantityStepper } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCartData } from '@/pkg-mall/services/cart';
import type { MallCartData, MallCartMerchantGroup, MallCartItem } from '@/pkg-mall/services/mock-data';
import './index.scss';

// 购物车首版按截图补齐商户分组、数量修改、猜你喜欢和底部结算栏，并串到订单确认页。
const CartPage = observer(function CartPage() {
  const [cartData, setCartData] = useState<MallCartData>();
  const [groups, setGroups] = useState<MallCartMerchantGroup[]>([]);
  const [editMode, setEditMode] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchCartData();
      setCartData(nextData);
      setGroups(nextData.groups);
    },
  });

  const recommendProducts = cartData?.recommendProducts ?? [];

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const checkedItems = flatItems.filter((item) => item.checked);
  const selectedCount = checkedItems.length;
  const totalAmount = checkedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const allChecked = flatItems.length > 0 && checkedItems.length === flatItems.length;

  function updateItem(productId: string, updater: (item: MallCartItem) => MallCartItem) {
    setGroups((currentGroups) => currentGroups
      .map((group) => ({
        ...group,
        items: group.items.map((item) => (item.id === productId ? updater(item) : item)),
      }))
      .filter((group) => group.items.length > 0));
  }

  function handleToggleItem(productId: string) {
    updateItem(productId, (item) => ({ ...item, checked: !item.checked }));
  }

  function handleQuantityChange(productId: string, value: number) {
    updateItem(productId, (item) => ({ ...item, quantity: value }));
  }

  function handleToggleAll() {
    const nextChecked = !allChecked;
    setGroups((currentGroups) => currentGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, checked: nextChecked })),
    })));
  }

  function handlePrimaryAction() {
    if (editMode) {
      setGroups((currentGroups) => currentGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.checked),
        }))
        .filter((group) => group.items.length > 0));
      Taro.showToast({
        title: '已删除选中商品',
        icon: 'none',
      });
      return;
    }

    if (!selectedCount) {
      Taro.showToast({
        title: '请先选择商品',
        icon: 'none',
      });
      return;
    }

    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderCheckout });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="购物车"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        navbarRight={(
          <Text className="_pg-navbar_action" onClick={() => setEditMode((currentValue) => !currentValue)}>
            {editMode ? '完成' : '编辑'}
          </Text>
        )}
        footer={(
          <View className="_pg-footer">
            <View className="_pg-footer_select" onClick={handleToggleAll}>
              <View className={`_pg-footer_checkbox ${allChecked ? '_pg-footer_checkbox--checked' : ''}`}>
                {allChecked ? <Text>✓</Text> : null}
              </View>
              <Text className="_pg-footer_select-text">全选</Text>
            </View>

            <View className="_pg-footer_summary">
              <Text className="_pg-footer_summary-label">合计:</Text>
              <Text className="_pg-footer_summary-amount">¥{totalAmount.toFixed(0)}</Text>
            </View>

            <View className="_pg-footer_button" onClick={handlePrimaryAction}>
              <Text>{editMode ? '删除' : '结算'}</Text>
            </View>
          </View>
        )}
      >
        <View className="_pg-page">
          {groups.map((group) => (
            <View className="_pg-group" key={group.id}>
              <Text className="_pg-group_title">{group.merchantName}</Text>
              {group.promotionTags.length > 0 ? (
                <View className="_pg-group_tags">
                  {group.promotionTags.map((tag) => (
                    <View className="_pg-group_tag" key={tag}>
                      <Text>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {group.items.map((item) => (
                <View className="_pg-item" key={item.id}>
                  <View className="_pg-item_check" onClick={() => handleToggleItem(item.id)}>
                    <View className={`_pg-item_checkbox ${item.checked ? '_pg-item_checkbox--checked' : ''}`}>
                      {item.checked ? <Text>✓</Text> : null}
                    </View>
                  </View>
                  <AppImage className="_pg-item_image" src={item.image.src} mode="aspectFill" emptyState="error" />
                  <View className="_pg-item_body">
                    <Text className="_pg-item_title">{item.title}</Text>
                    <View className="_pg-item_sku">
                      <Text>{item.skuText}</Text>
                    </View>
                    <View className="_pg-item_footer">
                      <Text className="_pg-item_price">¥ {item.price}</Text>
                      <QuantityStepper value={item.quantity} min={1} onChange={(value) => handleQuantityChange(item.id, value)} />
                    </View>
                    {item.giftText ? <Text className="_pg-item_gift">{item.giftText}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View className="_pg-recommend">
            <View className="_pg-recommend_header">
              <Text className="_pg-recommend_line">—</Text>
              <Text className="_pg-recommend_title">猜你喜欢</Text>
              <Text className="_pg-recommend_line">—</Text>
            </View>
            <View className="_pg-recommend_grid">
              {recommendProducts.map((product) => (
                <View
                  className="_pg-recommend_item"
                  key={product.id}
                  onClick={() => {
                    Taro.navigateTo({
                      url: `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${product.id}`,
                    });
                  }}
                >
                  <AppImage className="_pg-recommend_image" src={product.image.src} mode="aspectFit" emptyState="error" />
                  <Text className="_pg-recommend_name">{product.title}</Text>
                  <View className="_pg-recommend_footer">
                    <Text className="_pg-recommend_price">¥ {product.price}</Text>
                    <Text className="_pg-recommend_sales">{product.salesText}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default CartPage;
