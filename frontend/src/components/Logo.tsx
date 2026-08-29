const Logo = () => {
  return (
    <svg
      viewBox="0 0 32 32"
      className="w-7 h-7 fill-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19 14C17.5 7.5 13 4.5 13 4.5"
        stroke="#15803d"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 15.5C14.5 11 13.5 4.5 13 4.5"
        stroke="#15803d"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13 4.5C9.5 5.5 7 9 7 9"
        stroke="#15803d"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 7.5C10.5 7 13 4.5 13 4.5C13 4.5 11.5 8 9.5 9C7.5 10 8.5 7.5 8.5 7.5Z"
        fill="#22c55e"
      />
      <circle cx="12" cy="18" r="6" fill="#ef4444" />
      <circle cx="12" cy="18" r="6" fill="url(#headerCherryGlow1)" />
      <circle cx="20" cy="16" r="6.5" fill="#dc2626" />
      <circle cx="20" cy="16" r="6.5" fill="url(#headerCherryGlow2)" />
      <circle cx="10" cy="15" r="1.5" fill="white" opacity="0.8" />
      <circle cx="18" cy="13" r="1.7" fill="white" opacity="0.8" />

      <defs>
        <radialGradient id="headerCherryGlow1" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="headerCherryGlow2" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default Logo;
