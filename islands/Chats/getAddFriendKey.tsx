import { useEffect, useState } from "preact/hooks"
interface InputProps {
    value: string
    setValue: (value: string) => void
    origin: string
}

export default function RegisterForm(props: any) {
    const [showModal, setShowModal] = useState(false)
    const [value, setValue] = useState("")
    const handleButtonClick = () => {
        setShowModal(!showModal)
    }
    useEffect(() => {
        const fetchData = async () => {
            const resp = await fetch("/api/v1/chats/friendkey?reload=false")
            const data = await resp.json()
            if (data.status === false) {
                console.log("error")
                return
            }
            const origin = window.location.protocol + "//" +
                window.location.host
            const url = origin + "/?key=" + data.addFriendKey
            setValue(url)
        }
        fetchData()
    }, [showModal])
    return (
        <>
            <li class="c-talk-rooms">
                <a
                    onClick={() => {
                        setShowModal(!showModal)
                    }}
                >
                    <div class="c-talk-rooms-icon">
                        <img src="/people.png" alt="" />
                    </div>
                    <div class="c-talk-rooms-box">
                        <div class="c-talk-rooms-name">
                            <p>招待URLを作成</p>
                        </div>
                        <div class="c-talk-rooms-msg">
                            <p></p>
                        </div>
                    </div>
                </a>
            </li>
            {showModal && (
                <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
                    <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[320px] w-full h-full p-5 rounded-xl shadow-lg relative">
                        <div class="absolute right-0 top-0 p-4">
                            <span
                                class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                                onClick={handleButtonClick}
                            >
                                ×
                            </span>
                        </div>
                        <div class="h-full px-2 lg:px-3 flex flex-col">
                            <div class="text-sm">
                                <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                                    友達追加用URLを作成
                                </p>
                            </div>
                            <div class="flex-grow flex flex-col justify-center">
                                <Input
                                    value={value}
                                    setValue={setValue}
                                    origin={props.origin}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
async function copyToClipboard(value: string, setIsCopied: any) {
    try {
        await navigator.clipboard.writeText(value)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 3000)
    } catch (err) {
        alert("Failed to copy!")
    }
}
function Input({
    value,
    setValue,
    origin,
}: InputProps) {
    const handleChangeUrl = (event: any) => {
        event.preventDefault()
        const updateurl = async () => {
            const resp = await fetch("/api/v1/chats/friendkey?reload=true")
            const data = await resp.json()
            if (data.status === false) {
                console.log("error")
                return
            }
            const origin = window.location.protocol + "//" +
                window.location.host +
                "/?key="
            const url = origin + data.addFriendKey
            setValue(url)
        }
        updateurl()
    }

    const [isCopied, setIsCopied] = useState(null)
    return (
        <>
            <label
                for="email"
                class="block mb-2 text-sm font-medium text-black dark:text-white"
            >
                友達登録用URL
            </label>
            <div class="w-full">
                <input
                    value={value}
                    class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
                    readonly
                />
            </div>
            <div class="flex w-full pt-3 justify-between">
                <div class="1/2">
                    <button
                        onClick={() => {
                            copyToClipboard(value, setIsCopied)
                        }}
                        type="submit"
                        class="rounded-lg bg-white ring-1 ring-[rgba(0,0,0,5%)] shadow-[0_0.5px_2.5px_rgba(0,0,0,30%)] px-5 py-2 hover:bg-gray-100 dark:bg-[#181818] dark:hover:bg-[#2b2b2b]"
                    >
                        コピー
                    </button>
                    <div class={isCopied ? "flex items-center mt-1" : "flex items-center mt-1 opacity-0"}>
                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="16" height="16" viewBox="0 0 256 256" xml:space="preserve">
                            <defs>
                            </defs>
                            <g
                                style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;"
                                transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)"
                            >
                                <circle
                                    cx="45"
                                    cy="45"
                                    r="45"
                                    style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: #259c5e; fill-rule: nonzero; opacity: 1;"
                                    transform="  matrix(1 0 0 1 0 0) "
                                />
                                <path
                                    d="M 38.478 64.5 c -0.01 0 -0.02 0 -0.029 0 c -1.3 -0.009 -2.533 -0.579 -3.381 -1.563 L 21.59 47.284 c -1.622 -1.883 -1.41 -4.725 0.474 -6.347 c 1.884 -1.621 4.725 -1.409 6.347 0.474 l 10.112 11.744 L 61.629 27.02 c 1.645 -1.862 4.489 -2.037 6.352 -0.391 c 1.862 1.646 2.037 4.49 0.391 6.352 l -26.521 30 C 40.995 63.947 39.767 64.5 38.478 64.5 z"
                                    style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;"
                                    transform=" matrix(1 0 0 1 0 0) "
                                    stroke-linecap="round"
                                />
                            </g>
                        </svg>
                        <p class="text-sm text-[#259c5e] ml-1">コピーしました！</p>
                    </div>
                </div>
                <div class="1/2">
                    <button
                        onClick={handleChangeUrl}
                        type="submit"
                        class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none"
                    >
                        URLを変更
                    </button>
                </div>
            </div>
        </>
    )
}
