import './index.less';

export const LogoUrl = '';

export const Logo = ({ hideLogo = false }: { hideLogo?: boolean }) => {
  if (hideLogo) {
    return null;
  }

  return <div className="logo">Midscene</div>;
};
