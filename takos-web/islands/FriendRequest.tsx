// Define the InputProps interface for type-checking
interface InputProps {
  value: string;
  setValue: (value: string) => void;
  origin: string;
}

// Define the RegisterForm component
export default function RegisterForm() {
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState("");

  // Toggle the modal visibility
  const handleButtonClick = () => {
    setShowModal(!showModal);
  };
  return (
    <>
      <li class="c-talk-rooms">
        <a onClick={handleButtonClick}>
          <div class="c-talk-rooms-icon">
            <img src="/people.png" alt="" />
          </div>
          <div class="c-talk-rooms-box">
            <div class="c-talk-rooms-name">
              <p>リクエスト</p>
            </div>
            <div class="c-talk-rooms-msg">
              <p></p>
            </div>
          </div>
        </a>
      </li>
      {showModal && (
        <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
          <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-[600px] max-h-[620px] w-full h-full p-5 rounded-xl shadow-lg relative">
            <div class="absolute right-0 top-0 p-4">
              <span
                class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                onClick={handleButtonClick}
              >
                ×
              </span>
            </div>
            <div class="w-full px-2 lg:px-3 h-full flex flex-col">
              <div class="text-sm grow-0">
                <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                  保留中
                </p>
              </div>
              <div class="grow">
                <Input
                  state={state}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Define the Input component
function Input(
  { state }: { state: AppStateType },
) {
  return (
    <>
      <div class="w-full text-gray-900 text-sm rounded-lg h-full">
        <VideoList
          state={state}
        />
      </div>
    </>
  );
}

// Define the VideoList component
const VideoList = () => {
  const [items, setItems] = useState<{
    requesterId: string;
    targetName: string;
    type: string;
    uuid: string;
  }[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/takos/v2/client/friends/requestList");
      const response = await res.json();
      console.log(response);
      setItems(response.requests);
    };
    fetchData();
  }, []);

  return (
    <div className="container mx-auto h-full">
      <div className="bg-white dark:bg-[#181818] rounded-lg overflow-y-auto mx-auto h-full">
        <ul className="space-y-2 p-4 h-full overflow-y-auto">
          {items.length !== 0
            ? (
              <>
                {items.map((video, index) => {
                  if (!video) {
                    return null;
                  }
                  return (
                    <User
                      key={index}
                      icon={"/takos/v2/client/users/icon/requester?userName=" +
                        video.requesterId}
                      userName={video.requesterId}
                      type={video.type}
                      acceptOnClick={async () => {
                        //
                      }}
                      rejectOnClick={() => {
                        alert("まだ対応してません");
                      }}
                    />
                  );
                })}
              </>
            )
            : (
              <div class="flex justify-center items-center h-full text-black dark:text-white">
                <p>フレンド申請は届いていません</p>
              </div>
            )}
        </ul>
      </div>
    </div>
  );
};

function User(
  { icon, userName, acceptOnClick, rejectOnClick, type }: {
    icon: string;
    userName: string;
    type: string;
    acceptOnClick?: () => void;
    rejectOnClick?: () => void;
  },
) {
  return (
    <>
      <li class="h-16 mb-3 w-full flex justify-between bg-white px-2.5 py-2 dark:bg-[#181818]">
        <a class="flex">
          <div class="c-talk-rooms-icon">
            <img src={icon} />
          </div>
          <div class="c-talk-rooms-box">
            <div class="c-talk-rooms-name">
              <p>{userName + `(${type})`}</p>
            </div>
            <div class="c-talk-rooms-msg">
            </div>
          </div>
        </a>
        <div class="flex gap-1 items-center">
          <button
            class="w-9 h-9 p-1 border border-[#41d195] rounded-full hover:bg-[rgba(120,120,128,12%)] dark:hover:bg-[rgba(118,118,128,12%)]"
            onClick={acceptOnClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                class="fill-[#41d195]"
                d="M9.86 18a1 1 0 0 1-.73-.32l-4.86-5.17a1 1 0 1 1 1.46-1.37l4.12 4.39l8.41-9.2a1 1 0 1 1 1.48 1.34l-9.14 10a1 1 0 0 1-.73.33Z"
              />
            </svg>
          </button>
          <button
            class="w-9 h-9 p-1 border border-[#d14141] rounded-full hover:bg-[rgba(120,120,128,12%)] dark:hover:bg-[rgba(118,118,128,30%)]"
            onClick={rejectOnClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                class="fill-[#d14141]"
                d="m13.41 12l4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42l4.3 4.29l-4.3 4.29a1 1 0 0 0 0 1.42a1 1 0 0 0 1.42 0l4.29-4.3l4.29 4.3a1 1 0 0 0 1.42 0a1 1 0 0 0 0-1.42Z"
              />
            </svg>
          </button>
        </div>
      </li>
    </>
  );
}
