export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/legacy/home.html",
      permanent: false
    }
  };
}

export default function Index() {
  return null;
}
