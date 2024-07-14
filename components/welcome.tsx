function welcome() {
  return (
    <div class="flex w-full h-screen">
      <div class="lg:w-1/2 w-full m-5 lg:m-0">
        <div class="bg-white text-black rounded-lg shadow-[0_12px_32px_#00000040] p-6 max-w-[472px] lg:ml-[100px] lg:mt-[80px] mx-auto">
          <div class="flex mb-3">
            <div class="w-full">
              <div class="flex items-center mb-4">
                <img
                  src="./logo-mine.jpg"
                  alt="logo"
                  class="w-20 h-20 rounded-lg shadow-md"
                />
                <h1 class="text-3xl font-bold ml-4">
                  takos.jp
                </h1>
              </div>
              <div class="text-base text-gray-700 mb-6">
                takos.jpは、次世代の分散型チャットサービスを提供する日本発のプロジェクトです。このサービスは、ユーザーの意見を反映したサーバーに登録や移行が可能で、無駄な機能を排除し、本当に必要な機能のみを実装することを目指しています。
              </div>
            </div>
          </div>
          <button class="bg-[#00acee] text-white rounded-3xl py-2 px-4 hover:bg-[#00a0e9] w-full">
            このサーバーに登録する
          </button>
          <button
            onClick={() => {
              alert("まだ実装してない！！！");
            }}
            class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3"
          >
            他のサーバーを探す
          </button>
          <button class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3">ログイン</button>
        </div>
      </div>
      <div class="lg:w-1/2 hidden lg:block">
      </div>
    </div>
  );
}

export default welcome;
