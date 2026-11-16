exports.activate = () => {
  throw new Error(
    "Contextory must not activate the native-agent detection fixture.",
  );
};
