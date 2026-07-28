import InnerLayout from '@/components/InnerLayout';
import $i18n from '@/i18n';
import A2aManage from './Manage';

export default function () {
  return (
    <InnerLayout
      breadcrumbLinks={[
        {
          title: $i18n.get({
            id: 'main.pages.App.index.home',
            dm: '首页',
          }),
          path: '/',
        },
        {
          title: $i18n.get({
            id: 'main.pages.A2A.index.a2aManagement',
            dm: 'A2A管理',
          }),
        },
      ]}
    >
      <A2aManage />
    </InnerLayout>
  );
}
