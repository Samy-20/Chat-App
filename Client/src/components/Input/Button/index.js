import React from "react";

const Button = ({
  label = "Button",
  type = "button",
  className = "",
  disabled = false,
}) => {
  return (
    <div className="w-1/2">
      <button
        type={type}
        className={
          `text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm w-full px-10 py-2.5 text-center ${className}`}
        disabled={disabled}
      >{label}</button>
    </div>
  );
};

export default Button;
