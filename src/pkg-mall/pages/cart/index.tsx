import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { QuantityStepper } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { createMallCheckoutDraft } from '@/core/services/mall-checkout-draft';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { formatCurrency } from '@/core/utils/money';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { previewWechatImages, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import {
  deleteMallCartItem,
  deleteMallCartItems,
  fetchCartData,
  updateMallCartCheckedItems,
  updateMallCartItem,
} from '@/pkg-mall/services/cart';
import { MallCartActionBar } from '@/pkg-mall/components/MallCartActionBar';
import type { MallCartData, MallCartMerchantGroup, MallCartItem } from '@/pkg-mall/services/types';
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
    loginRequired: true,
    loginReason: '登录后可查看购物车',
  });

  const recommendProducts = cartData?.recommendProducts ?? [];

  const flatItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const checkedItems = flatItems.filter((item) => item.checked);
  const selectedCount = checkedItems.length;
  const selectedQuantity = checkedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartData?.totalAmount ?? 0;
  const allChecked = flatItems.length > 0 && checkedItems.length === flatItems.length;
  const hasCartItems = flatItems.length > 0;

  function applyCartData(nextData: MallCartData) {
    setCartData(nextData);
    setGroups(nextData.groups);
  }

  async function handleCartMutation(task: () => Promise<MallCartData>, fallbackMessage = '购物车更新失败') {
    try {
      const nextData = await pageRuntime.withLoading(task);
      applyCartData(nextData);
      return nextData;
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, fallbackMessage));
      return undefined;
    }
  }

  function handleToggleItem(item: MallCartItem) {
    void handleCartMutation(() => updateMallCartItem(item.id, { checked: !item.checked }));
  }

  async function handleQuantityChange(item: MallCartItem, value: number) {
    if (value <= 0) {
      await handleDeleteSingleItem(item);
      return;
    }

    await handleCartMutation(() => updateMallCartItem(item.id, { quantity: value }));
  }

  function resolveCartProductId(item: MallCartItem) {
    return item.productId || item.id.split(':')[0] || item.id;
  }

  function handleProductPress(item: MallCartItem) {
    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${encodeURIComponent(resolveCartProductId(item))}`);
  }

  function handlePreviewItemImage(item: MallCartItem) {
    void previewWechatImages({
      urls: [item.image.src],
      current: item.image.src,
      emptyText: '暂无商品大图',
    });
  }

  async function handleToggleAll() {
    const nextChecked = !allChecked;
    await handleCartMutation(() => updateMallCartCheckedItems(flatItems, nextChecked));
  }

  async function handleDeleteSingleItem(item: MallCartItem) {
    const confirmed = await showWechatConfirm({
      title: '删除商品',
      content: `确定从购物车删除「${item.title}」吗？`,
      confirmText: '删除',
      cancelText: '取消',
    });

    if (!confirmed) return;

    const nextData = await handleCartMutation(() => deleteMallCartItem(item.id), '商品删除失败');
    if (!nextData) return;
    await showWechatToast('已删除商品', 'success');
  }

  async function handlePrimaryAction() {
    if (editMode) {
      if (!selectedCount) {
        await showWechatToast('请先选择商品');
        return;
      }

      const confirmed = await showWechatConfirm({
        title: '删除商品',
        content: `确定从购物车删除选中的 ${selectedCount} 件商品吗？`,
        confirmText: '删除',
        cancelText: '取消',
      });
      if (!confirmed) return;

      const nextData = await handleCartMutation(() => deleteMallCartItems(checkedItems.map((item) => item.id)), '商品删除失败');
      if (!nextData) return;
      await showWechatToast('已删除选中商品', 'success');
      return;
    }

    if (!selectedCount) {
      await showWechatToast('请先选择商品');
      return;
    }

    const draft = createMallCheckoutDraft({
      products: checkedItems.map((item) => ({
        id: item.skuId || item.id,
        productId: item.productId || item.id.split(':')[0] || item.id,
        title: item.title,
        specText: item.skuText || item.subtitle || '',
        quantity: item.quantity,
        unitPrice: item.price,
        imageSrc: item.image.src,
        merchantName: item.merchantName,
        giftText: item.giftText,
        canRefund: item.canRefund ?? true,
        canAfterSale: item.canAfterSale ?? true,
        shippingRule: item.shippingRule ?? { mode: 'unsupported', reasonText: '当前商品暂不可配送，请返回商品页重新选择' },
        sourceCartItemId: item.id,
      })),
    });

    if (!draft) {
      await showWechatToast('当前商品暂不可结算');
      return;
    }

    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderCheckout}?draftId=${encodeURIComponent(draft.id)}`);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="购物车"
        className="_pg-shell"
        reserveTabBarSpace={false}
        scrollViewProps={{}}
        navbarRight={hasCartItems ? (
          <Text
            className="_pg-navbar_action"
            onClick={() => {
              setEditMode((currentValue) => {
                const nextEditMode = !currentValue;
                return nextEditMode;
              });
            }}
          >
            {editMode ? '完成' : '编辑'}
          </Text>
        ) : undefined}
        footer={hasCartItems ? (
          <MallCartActionBar
            selectControl={{
              checked: allChecked,
              label: '全选',
              onClick: handleToggleAll,
            }}
            summaryLines={editMode ? [{
              label: '已选',
              value: selectedQuantity,
              suffix: '件',
              valueKind: 'count',
            }] : [{
              label: '合计:',
              value: formatCurrency(totalAmount),
              valueKind: 'amount',
            }]}
            buttonText={editMode ? '删除' : '结算'}
            buttonVariant={editMode ? 'danger' : 'primary'}
            onButtonClick={handlePrimaryAction}
          />
        ) : undefined}
      >
        <View className="_pg-page">
          {hasCartItems ? (
            groups.map((group) => (
              <View className="_pg-group" key={group.id}>
                <Text className="_pg-group_title">{group.merchantName || '未提供'}</Text>
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
                    <View className="_pg-item_check" onClick={() => handleToggleItem(item)}>
                      <View className={`_pg-item_checkbox ${item.checked ? '_pg-item_checkbox--checked' : ''}`}>
                        {item.checked ? <AppIcon name="check" size={10} color="#ffffff" /> : null}
                      </View>
                    </View>
                    <AppImage
                      className="_pg-item_image"
                      src={item.image.src}
                      mode="aspectFill"
                      emptyState="error"
                      onClick={() => handlePreviewItemImage(item)}
                    />
                    <View className="_pg-item_body">
                      <Text className="_pg-item_title" onClick={() => handleProductPress(item)}>{item.title}</Text>
                      {item.skuText ? (
                        <View className="_pg-item_sku">
                          <Text>{item.skuText}</Text>
                        </View>
                      ) : null}
                      <View className="_pg-item_footer">
                        <Text className="_pg-item_price">{formatCurrency(item.price)}</Text>
                        <QuantityStepper value={item.quantity} min={0} onChange={(value) => void handleQuantityChange(item, value)} />
                      </View>
                      {item.giftText ? <Text className="_pg-item_gift">{item.giftText}</Text> : null}
                      {editMode ? (
                        <View className="_pg-item_edit-actions">
                          <View
                            className="_pg-item_edit-action _pg-item_edit-action--danger"
                            onClick={() => void handleDeleteSingleItem(item)}
                          >
                            <Text>删除</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <BaseEmpty
              className="_pg-empty"
              title="购物车空空的"
              description="去挑选喜欢的乐园好物，加入后可一起结算。"
              actionText="去逛逛"
              onAction={() => {
                void navigateToMiniRoute(MINI_PACKAGE_ROUTES.mallHome);
              }}
            />
          )}

          {recommendProducts.length > 0 ? (
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
                      <Text className="_pg-recommend_price">{formatCurrency(product.price)}</Text>
                      <Text className="_pg-recommend_sales">{product.salesText}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </PageShell>
    </View>
  ));
});

export default CartPage;
