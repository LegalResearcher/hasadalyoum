import { ReactNode } from "react";
import TopBar from "./TopBar";
import Header from "./Header";
import Navigation from "./Navigation";
import BreakingNews from "./BreakingNews";
import LastUpdate from "./LastUpdate";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <Navigation />
      <BreakingNews />
      <LastUpdate />
      <main className="flex-1 py-8">
        <div className="container">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
