import { NavLink } from "react-router-dom";

export const Navbar = () => {
  return (
    <nav>
      <NavLink to="/">Home</NavLink>
      <NavLink to="layout">Layout</NavLink>
      <NavLink to="dfg">DFG</NavLink>
      <NavLink to="tree">Process Tree</NavLink>
      <NavLink to="files">Importing</NavLink>
      <NavLink to="tut1">Tutorial 1</NavLink>
      <NavLink to="tut2">Tutorial 2</NavLink>
    </nav>
  );
};
